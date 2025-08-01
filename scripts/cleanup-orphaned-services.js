#!/usr/bin/env node

// Script to clean up orphaned services in the scheduler
// These are services that belong to nests that no longer exist

import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

async function cleanupOrphanedServices() {
  console.log('🔍 Checking for orphaned services...\n');
  
  try {
    // Get all services from scheduler
    const schedulerServices = await redis.hgetall('scheduler:services');
    console.log(`Found ${Object.keys(schedulerServices).length} services in scheduler\n`);
    
    const orphanedServices = [];
    const validServices = [];
    
    // Check each service
    for (const [serviceId, serviceData] of Object.entries(schedulerServices)) {
      const service = JSON.parse(serviceData);
      const nestExists = await redis.get(`nest:${service.nestId}`);
      
      if (!nestExists) {
        orphanedServices.push({ id: serviceId, ...service });
        console.log(`❌ Orphaned service found:`);
        console.log(`   Service: ${service.name} (${serviceId})`);
        console.log(`   Type: ${service.type}`);
        console.log(`   Target: ${service.target}`);
        console.log(`   Missing Nest ID: ${service.nestId}\n`);
      } else {
        validServices.push({ id: serviceId, ...service });
      }
    }
    
    if (orphanedServices.length === 0) {
      console.log('✅ No orphaned services found!');
      process.exit(0);
    }
    
    console.log(`\nFound ${orphanedServices.length} orphaned services`);
    console.log(`Valid services: ${validServices.length}\n`);
    
    // Get available nests
    const nestKeys = [];
    const stream = redis.scanStream({
      match: 'nest:*',
      count: 100
    });
    
    stream.on('data', (keys) => {
      keys.forEach(key => {
        if (!key.includes(':services') && !key.includes(':users') && 
            !key.includes(':email') && !key.includes(':subdomain')) {
          nestKeys.push(key);
        }
      });
    });
    
    await new Promise((resolve) => stream.on('end', resolve));
    
    const nests = [];
    for (const key of nestKeys) {
      const nestData = await redis.get(key);
      if (nestData) {
        const nest = JSON.parse(nestData);
        nests.push(nest);
      }
    }
    
    console.log('Available nests:');
    nests.forEach((nest, index) => {
      console.log(`${index + 1}. ${nest.name} (${nest.subdomain}.guardant.me) - ${nest.email}`);
    });
    
    console.log('\nOptions:');
    console.log('1. Remove all orphaned services');
    console.log('2. Reassign to a specific nest');
    console.log('3. Exit without changes');
    
    // For now, just list the orphaned services
    // In a real implementation, you'd add interactive prompts here
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    redis.disconnect();
  }
}

cleanupOrphanedServices();