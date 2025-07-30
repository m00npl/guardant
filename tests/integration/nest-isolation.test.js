"use strict";
/**
 * Integration tests for multi-tenant nest isolation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_framework_1 = require("./test-framework");
(0, test_framework_1.integrationTest)('Nest Isolation - Services', async (ctx) => {
    // Create second nest
    const nest2Data = test_framework_1.TestDataGenerator.nest({ subdomain: 'test-nest-2' });
    const nest2Response = await ctx.apiClients.admin.post('/api/nests/register', nest2Data);
    const nest2 = await nest2Response.json();
    // Create service in nest 1
    ctx.apiClients.admin.setAuth(ctx.testNest.authToken);
    const service1Data = test_framework_1.TestDataGenerator.service(ctx.testNest.id);
    const service1Response = await ctx.apiClients.admin.post('/api/services', service1Data);
    const service1 = await service1Response.json();
    // Create service in nest 2
    ctx.apiClients.admin.setAuth(nest2.token);
    const service2Data = test_framework_1.TestDataGenerator.service(nest2.nest.id);
    const service2Response = await ctx.apiClients.admin.post('/api/services', service2Data);
    const service2 = await service2Response.json();
    // Test: Nest 1 cannot see nest 2's services
    ctx.apiClients.admin.setAuth(ctx.testNest.authToken);
    const nest1ServicesResponse = await ctx.apiClients.admin.get('/api/services');
    const nest1Services = await nest1ServicesResponse.json();
    // Assert isolation
    test_framework_1.TestAssertions.assertNestIsolation(nest1Services.services[0], service2.service, ctx.testNest.id, nest2.nest.id);
    // Test: Nest 2 cannot see nest 1's services
    ctx.apiClients.admin.setAuth(nest2.token);
    const nest2ServicesResponse = await ctx.apiClients.admin.get('/api/services');
    const nest2Services = await nest2ServicesResponse.json();
    test_framework_1.TestAssertions.assertNestIsolation(nest2Services.services[0], service1.service, nest2.nest.id, ctx.testNest.id);
});
(0, test_framework_1.integrationTest)('Nest Isolation - Status Pages', async (ctx) => {
    // Create services for test nest
    ctx.apiClients.admin.setAuth(ctx.testNest.authToken);
    const service = test_framework_1.TestDataGenerator.service(ctx.testNest.id);
    await ctx.apiClients.admin.post('/api/services', service);
    // Test: Public API with correct subdomain
    const publicResponse1 = await ctx.apiClients.public.get('/api/status', {
        headers: { 'X-Nest-Subdomain': ctx.testNest.subdomain }
    });
    const publicData1 = await publicResponse1.json();
    // Test: Public API with different subdomain returns 404
    const publicResponse2 = await ctx.apiClients.public.get('/api/status', {
        headers: { 'X-Nest-Subdomain': 'non-existent-nest' }
    });
    if (publicResponse2.status !== 404) {
        throw new Error(`Expected 404 for non-existent nest, got ${publicResponse2.status}`);
    }
});
(0, test_framework_1.integrationTest)('Nest Isolation - User Access', async (ctx) => {
    // Create second nest
    const nest2Data = test_framework_1.TestDataGenerator.nest({ subdomain: 'test-nest-2' });
    const nest2Response = await ctx.apiClients.admin.post('/api/nests/register', nest2Data);
    const nest2 = await nest2Response.json();
    // Create user in nest 1
    ctx.apiClients.admin.setAuth(ctx.testNest.authToken);
    const user1Data = test_framework_1.TestDataGenerator.user(ctx.testNest.id);
    await ctx.apiClients.admin.post('/api/users', user1Data);
    // Test: User from nest 1 cannot login to nest 2
    const loginResponse = await ctx.apiClients.admin.post('/api/auth/login', {
        email: user1Data.email,
        password: user1Data.password,
        nestId: nest2.nest.id
    });
    if (loginResponse.status !== 401) {
        throw new Error(`Expected 401 for cross-nest login, got ${loginResponse.status}`);
    }
});
(0, test_framework_1.integrationTest)('Nest Isolation - Monitoring Data', async (ctx) => {
    // Create services in test nest
    ctx.apiClients.admin.setAuth(ctx.testNest.authToken);
    const service = test_framework_1.TestDataGenerator.service(ctx.testNest.id);
    const serviceResponse = await ctx.apiClients.admin.post('/api/services', service);
    const serviceData = await serviceResponse.json();
    // Wait for monitoring to run
    await test_framework_1.TestAssertions.assertEventuallyTrue(async () => {
        const statusResponse = await ctx.apiClients.admin.get(`/api/services/${serviceData.service.id}/status`);
        const statusData = await statusResponse.json();
        return statusData.status.length > 0;
    }, 15000);
    // Create second nest with service
    const nest2Data = test_framework_1.TestDataGenerator.nest({ subdomain: 'test-nest-2' });
    const nest2Response = await ctx.apiClients.admin.post('/api/nests/register', nest2Data);
    const nest2 = await nest2Response.json();
    ctx.apiClients.admin.setAuth(nest2.token);
    const service2 = test_framework_1.TestDataGenerator.service(nest2.nest.id);
    await ctx.apiClients.admin.post('/api/services', service2);
    // Test: Nest 1 cannot access nest 2's monitoring data via direct ID
    ctx.apiClients.admin.setAuth(ctx.testNest.authToken);
    const crossNestStatusResponse = await ctx.apiClients.admin.get(`/api/services/${service2.id}/status`);
    if (crossNestStatusResponse.status !== 404) {
        throw new Error(`Expected 404 for cross-nest status access, got ${crossNestStatusResponse.status}`);
    }
});
(0, test_framework_1.integrationTest)('Nest Isolation - Cache Separation', async (ctx) => {
    // Create data in nest 1
    ctx.apiClients.admin.setAuth(ctx.testNest.authToken);
    const service1 = test_framework_1.TestDataGenerator.service(ctx.testNest.id);
    await ctx.apiClients.admin.post('/api/services', service1);
    // Access to warm cache
    await ctx.apiClients.admin.get('/api/services');
    // Create nest 2
    const nest2Data = test_framework_1.TestDataGenerator.nest({ subdomain: 'test-nest-2' });
    const nest2Response = await ctx.apiClients.admin.post('/api/nests/register', nest2Data);
    const nest2 = await nest2Response.json();
    // Test: Nest 2 doesn't get nest 1's cached data
    ctx.apiClients.admin.setAuth(nest2.token);
    const nest2ServicesResponse = await ctx.apiClients.admin.get('/api/services');
    const nest2Services = await nest2ServicesResponse.json();
    if (nest2Services.services.length !== 0) {
        throw new Error('Nest 2 received cached data from nest 1');
    }
    // Verify cache keys are properly namespaced
    const cacheKey1 = `nest:${ctx.testNest.id}:services`;
    const cacheKey2 = `nest:${nest2.nest.id}:services`;
    const cache1 = await ctx.redis.client.get(cacheKey1);
    const cache2 = await ctx.redis.client.get(cacheKey2);
    if (cache1 && cache2 && cache1 === cache2) {
        throw new Error('Cache keys are not properly isolated between nests');
    }
});
(0, test_framework_1.integrationTest)('Nest Isolation - Rate Limiting', async (ctx) => {
    // Create second nest
    const nest2Data = test_framework_1.TestDataGenerator.nest({ subdomain: 'test-nest-2' });
    const nest2Response = await ctx.apiClients.admin.post('/api/nests/register', nest2Data);
    const nest2 = await nest2Response.json();
    // Hit rate limit for nest 1
    ctx.apiClients.admin.setAuth(ctx.testNest.authToken);
    const requests1 = [];
    for (let i = 0; i < 105; i++) { // Assuming 100 req/min limit
        requests1.push(ctx.apiClients.admin.get('/api/services'));
    }
    const responses1 = await Promise.all(requests1);
    const rateLimited1 = responses1.filter(r => r.status === 429);
    if (rateLimited1.length === 0) {
        throw new Error('Rate limiting not working for nest 1');
    }
    // Test: Nest 2 should not be rate limited
    ctx.apiClients.admin.setAuth(nest2.token);
    const response2 = await ctx.apiClients.admin.get('/api/services');
    if (response2.status === 429) {
        throw new Error('Nest 2 was rate limited due to nest 1 activity');
    }
});
//# sourceMappingURL=nest-isolation.test.js.map