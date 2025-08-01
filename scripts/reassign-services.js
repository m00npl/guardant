#!/usr/bin/env node

import Redis from 'ioredis';
import readline from 'readline';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function reassignOrphanedServices() {
  console.log('🔍 Reassigning orphaned services to moon.pl.kr@gmail.com...\n');
  
  try {
    // Get moon nest ID
    const moonNestId = await redis.get('nest:email:moon.pl.kr@gmail.com');
    if (!moonNestId) {
      console.error('❌ Could not find nest for moon.pl.kr@gmail.com');
      process.exit(1);
    }
    
    const moonNestData = await redis.get(`nest:${moonNestId}`);
    const moonNest = JSON.parse(moonNestData);
    console.log(`✅ Found moon nest: ${moonNest.id} (${moonNest.subdomain}.guardant.me)\n`);
    
    // Get all services from scheduler
    const schedulerServices = await redis.hgetall('scheduler:services');
    const orphanedServices = [];
    
    // Check each service
    for (const [serviceId, serviceData] of Object.entries(schedulerServices)) {
      const service = JSON.parse(serviceData);
      const nestExists = await redis.exists(`nest:${service.nestId}`);
      
      if (!nestExists) {
        orphanedServices.push({ id: serviceId, ...service });
        console.log(`📋 Found orphaned service:`);
        console.log(`   ID: ${serviceId}`);
        console.log(`   Name: ${service.name}`);
        console.log(`   Type: ${service.type}`);
        console.log(`   Target: ${service.target}`);
        console.log(`   Old Nest: ${service.nestId}\n`);
      }
    }
    
    if (orphanedServices.length === 0) {
      console.log('✅ No orphaned services found!');
      process.exit(0);
    }
    
    console.log(`Found ${orphanedServices.length} orphaned service(s)\n`);
    const answer = await question('Do you want to reassign these services to moon.pl.kr@gmail.com? (y/n) ');
    
    if (answer.toLowerCase() === 'y') {
      console.log('\nReassigning orphaned services...\n');
      
      // Get existing services for moon nest
      const existingServicesData = await redis.get(`nest:${moonNest.id}:services`);
      const existingServices = existingServicesData ? JSON.parse(existingServicesData) : [];
      
      // Process each orphaned service
      for (const service of orphanedServices) {
        // Update nestId in scheduler
        service.nestId = moonNest.id;
        delete service.id; // Remove id from service object since it's the key
        await redis.hset('scheduler:services', service.id, JSON.stringify(service));
        
        // Add to nest's service list if not already there
        const serviceExists = existingServices.some(s => s.id === service.id);
        if (!serviceExists) {
          existingServices.push({
            id: service.id,
            nestId: moonNest.id,
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
        }
        
        console.log(`✅ Reassigned: ${service.name}`);
      }
      
      // Save updated service list
      await redis.set(`nest:${moonNest.id}:services`, JSON.stringify(existingServices));
      
      console.log('\n✅ All orphaned services have been reassigned!');
      console.log('   They will now appear under moon.pl.kr@gmail.com');
      console.log('   Refresh the admin panel to see the changes.\n');
    } else {
      console.log('\nCancelled. No changes made.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
    redis.disconnect();
  }
}

reassignOrphanedServices();