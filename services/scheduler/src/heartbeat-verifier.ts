import crypto from 'crypto';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('heartbeat-verifier');

interface HeartbeatData {
  workerId: string;
  region: string;
  version: string;
  lastSeen: number;
  checksCompleted: number;
  totalPoints: number;
  currentPeriodPoints: number;
  earnings: any;
  location: any;
  timestamp: number;
  signature?: string;
}

interface VerificationResult {
  isValid: boolean;
  reason?: string;
  sanitizedData?: HeartbeatData;
}

export class HeartbeatVerifier {
  private redis: any;
  private lastKnownStates: Map<string, any> = new Map();
  
  constructor(redis: any) {
    this.redis = redis;
  }

  async verifyHeartbeat(heartbeat: HeartbeatData, publicKey?: string): Promise<VerificationResult> {
    try {
      // 1. Verify signature if public key is available
      if (publicKey && heartbeat.signature) {
        const { signature, ...dataToVerify } = heartbeat;
        const isSignatureValid = this.verifySignature(
          JSON.stringify(dataToVerify),
          signature,
          publicKey
        );
        
        if (!isSignatureValid) {
          logger.warn('Invalid signature for worker', { workerId: heartbeat.workerId });
          return { isValid: false, reason: 'Invalid signature' };
        }
      }

      // 2. Verify timestamp is reasonable (not too far in future/past)
      const now = Date.now();
      const timeDiff = Math.abs(now - heartbeat.timestamp);
      if (timeDiff > 300000) { // 5 minutes
        logger.warn('Heartbeat timestamp out of range', { 
          workerId: heartbeat.workerId,
          timeDiff 
        });
        return { isValid: false, reason: 'Timestamp out of range' };
      }

      // 3. Verify points progression is reasonable
      const lastState = await this.getLastWorkerState(heartbeat.workerId);
      if (lastState) {
        // Points should only increase or stay the same
        if (heartbeat.totalPoints < lastState.totalPoints) {
          logger.warn('Points decreased suspiciously', {
            workerId: heartbeat.workerId,
            oldPoints: lastState.totalPoints,
            newPoints: heartbeat.totalPoints
          });
          return { isValid: false, reason: 'Invalid points progression' };
        }

        // Check for unrealistic point gains
        const pointsGained = heartbeat.totalPoints - lastState.totalPoints;
        const timeElapsed = heartbeat.timestamp - lastState.timestamp;
        const pointsPerSecond = pointsGained / (timeElapsed / 1000);
        
        // Maximum realistic rate: ~10 points per second (600/minute)
        if (pointsPerSecond > 10) {
          logger.warn('Suspicious point gain rate', {
            workerId: heartbeat.workerId,
            pointsPerSecond,
            pointsGained,
            timeElapsed
          });
          return { isValid: false, reason: 'Suspicious point gain rate' };
        }

        // Verify checks completed is increasing reasonably
        if (heartbeat.checksCompleted < lastState.checksCompleted) {
          logger.warn('Checks completed decreased', {
            workerId: heartbeat.workerId,
            old: lastState.checksCompleted,
            new: heartbeat.checksCompleted
          });
          return { isValid: false, reason: 'Invalid checks progression' };
        }
      }

      // 4. Verify location consistency
      if (lastState && lastState.location) {
        // Workers shouldn't change location frequently
        if (heartbeat.location.region !== lastState.location.region) {
          const timeSinceLastChange = heartbeat.timestamp - lastState.timestamp;
          if (timeSinceLastChange < 3600000) { // 1 hour
            logger.warn('Worker location changed too quickly', {
              workerId: heartbeat.workerId,
              oldRegion: lastState.location.region,
              newRegion: heartbeat.location.region
            });
            // Don't reject, but flag for review
          }
        }
      }

      // 5. Sanitize data to prevent injection
      const sanitizedData: HeartbeatData = {
        workerId: this.sanitizeString(heartbeat.workerId),
        region: this.sanitizeString(heartbeat.region),
        version: this.sanitizeString(heartbeat.version),
        lastSeen: Math.floor(heartbeat.lastSeen),
        checksCompleted: Math.floor(heartbeat.checksCompleted),
        totalPoints: Math.floor(heartbeat.totalPoints),
        currentPeriodPoints: Math.floor(heartbeat.currentPeriodPoints),
        earnings: {
          points: Math.floor(heartbeat.earnings?.points || 0),
          estimatedUSD: parseFloat((heartbeat.earnings?.estimatedUSD || 0).toFixed(6)),
          estimatedCrypto: parseFloat((heartbeat.earnings?.estimatedCrypto || 0).toFixed(9))
        },
        location: {
          continent: this.sanitizeString(heartbeat.location?.continent || 'Unknown'),
          country: this.sanitizeString(heartbeat.location?.country || 'Unknown'),
          city: this.sanitizeString(heartbeat.location?.city || 'Unknown'),
          region: this.sanitizeString(heartbeat.location?.region || 'Unknown')
        },
        timestamp: heartbeat.timestamp,
        signature: heartbeat.signature
      };

      // Store state for future verification
      await this.storeWorkerState(heartbeat.workerId, sanitizedData);

      return { 
        isValid: true, 
        sanitizedData 
      };

    } catch (error) {
      logger.error('Error verifying heartbeat', error);
      return { isValid: false, reason: 'Verification error' };
    }
  }

  private verifySignature(data: string, signature: string, publicKey: string): boolean {
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();
      return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
      logger.error('Signature verification failed', error);
      return false;
    }
  }

  private sanitizeString(input: any): string {
    if (typeof input !== 'string') return 'Unknown';
    // Remove any potential injection characters
    return input.replace(/[^\w\s\-\.@]/g, '').substring(0, 100);
  }

  private async getLastWorkerState(workerId: string): Promise<any> {
    try {
      const stateKey = `worker:state:${workerId}`;
      const state = await this.redis.get(stateKey);
      return state ? JSON.parse(state) : null;
    } catch (error) {
      logger.error('Failed to get worker state', error);
      return null;
    }
  }

  private async storeWorkerState(workerId: string, state: any): Promise<void> {
    try {
      const stateKey = `worker:state:${workerId}`;
      await this.redis.setex(stateKey, 86400, JSON.stringify(state)); // 24 hour TTL
    } catch (error) {
      logger.error('Failed to store worker state', error);
    }
  }

  // Detect anomalies across all workers
  async detectAnomalies(): Promise<any[]> {
    const anomalies = [];
    
    try {
      // Get all workers
      const workers = await this.redis.hgetall('workers:heartbeat');
      
      // Calculate average points per worker
      const pointsArray = Object.values(workers).map((w: any) => {
        const data = JSON.parse(w);
        return data.totalPoints || 0;
      });
      
      if (pointsArray.length > 0) {
        const avgPoints = pointsArray.reduce((a, b) => a + b, 0) / pointsArray.length;
        const stdDev = Math.sqrt(
          pointsArray.reduce((sq, n) => sq + Math.pow(n - avgPoints, 2), 0) / pointsArray.length
        );
        
        // Flag workers with points > 3 standard deviations from mean
        for (const [workerId, workerData] of Object.entries(workers)) {
          const data = JSON.parse(workerData as string);
          if (Math.abs(data.totalPoints - avgPoints) > 3 * stdDev) {
            anomalies.push({
              workerId,
              type: 'points_anomaly',
              points: data.totalPoints,
              avgPoints,
              stdDev
            });
          }
        }
      }
      
    } catch (error) {
      logger.error('Failed to detect anomalies', error);
    }
    
    return anomalies;
  }
}