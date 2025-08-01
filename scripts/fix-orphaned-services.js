#!/usr/bin/env node

import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'guardant-redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

async function fixOrphanedServices() {
  console.log('🔧 Fixing orphaned services for moon.pl.kr@gmail.com...\n');
  
  try {
    // Get moon nest ID
    const moonNestId = await redis.get('nest:email:moon.pl.kr@gmail.com');
    if (!moonNestId) {
      console.error('❌ Could not find nest for moon.pl.kr@gmail.com');
      process.exit(1);
    }
    
    console.log(`✅ Found moon nest: ${moonNestId}\n`);
    
    // Get all services from scheduler that belong to moon nest
    const schedulerServices = await redis.hgetall('scheduler:services');
    const moonServices = [];
    
    for (const [serviceId, serviceData] of Object.entries(schedulerServices)) {
      const service = JSON.parse(serviceData);
      if (service.nestId === moonNestId) {
        moonServices.push({
          id: serviceId,
          nestId: moonNestId,
          name: service.name,
          type: service.type,
          target: service.target,
          interval: service.interval || 60,
          isActive: service.enabled !== false,
          createdAt: service.createdAt || Date.now(),
          updatedAt: Date.now(),
          lastCheck: service.lastCheck || null,
          monitoring: service.monitoring || {
            regions: ['eu-central-1', 'eu-west-1', 'us-east-1'],
            strategy: 'round-robin',
            minRegions: 1,
            maxRegions: 3
          }
        });
        console.log(`📋 Found service: ${service.name} (${service.type})`);
      }
    }
    
    if (moonServices.length === 0) {
      console.log('No services found for moon nest in scheduler.');
    } else {
      // Save the services to the nest's service list
      await redis.set(`nest:${moonNestId}:services`, JSON.stringify(moonServices));
      console.log(`\n✅ Updated moon nest with ${moonServices.length} service(s)`);
    }
    
    console.log('\n✨ Done! Services should now appear in the admin panel.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    redis.disconnect();
  }
}

fixOrphanedServices();