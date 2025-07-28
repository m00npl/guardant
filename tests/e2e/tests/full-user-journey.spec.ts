import { test, expect, Page } from '@playwright/test';

const TEST_NEST = {
  subdomain: `e2e-test-${Date.now()}`,
  email: `e2e-${Date.now()}@example.com`,
  password: 'E2ETest123!@#'
};

const TEST_SERVICE = {
  name: 'E2E Test Service',
  url: 'https://httpstat.us/200',
  checkInterval: '30'
};

test.describe('Full User Journey', () => {
  test('Complete flow: Registration → Service Creation → Status Viewing', async ({ page, context }) => {
    // Step 1: Register new nest
    await test.step('Register new nest', async () => {
      await page.goto('/register');
      
      // Fill registration form
      await page.fill('input[name="subdomain"]', TEST_NEST.subdomain);
      await page.fill('input[name="email"]', TEST_NEST.email);
      await page.fill('input[name="password"]', TEST_NEST.password);
      await page.fill('input[name="confirmPassword"]', TEST_NEST.password);
      
      // Submit
      await page.click('button[type="submit"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('h1')).toContainText('Dashboard');
    });

    // Step 2: Create first service
    await test.step('Create monitoring service', async () => {
      await page.click('text=Add Service');
      
      // Fill service form
      await page.fill('input[name="name"]', TEST_SERVICE.name);
      await page.fill('input[name="url"]', TEST_SERVICE.url);
      await page.selectOption('select[name="type"]', 'web');
      await page.selectOption('select[name="checkInterval"]', TEST_SERVICE.checkInterval);
      
      // Enable monitoring
      await page.check('input[name="enabled"]');
      
      // Submit
      await page.click('button:has-text("Create Service")');
      
      // Should show in services list
      await expect(page.locator(`text=${TEST_SERVICE.name}`)).toBeVisible();
    });

    // Step 3: Wait for monitoring data
    await test.step('Verify monitoring is working', async () => {
      // Wait for first check to complete (max 40s)
      await page.waitForTimeout(5000); // Initial delay
      
      // Refresh to get latest data
      await page.reload();
      
      // Check status indicator
      const statusIndicator = page.locator(`[data-service-name="${TEST_SERVICE.name}"] .status-indicator`);
      await expect(statusIndicator).toHaveClass(/status-up/, { timeout: 40000 });
      
      // Click on service to see details
      await page.click(`text=${TEST_SERVICE.name}`);
      
      // Should show response time chart
      await expect(page.locator('.response-time-chart')).toBeVisible();
      await expect(page.locator('.uptime-percentage')).toContainText('%');
    });

    // Step 4: View public status page
    await test.step('View public status page', async () => {
      // Open new tab for public page
      const publicPage = await context.newPage();
      await publicPage.goto(`http://localhost:3001?nest=${TEST_NEST.subdomain}`);
      
      // Should show service status
      await expect(publicPage.locator('h1')).toContainText('Service Status');
      await expect(publicPage.locator(`text=${TEST_SERVICE.name}`)).toBeVisible();
      
      // Status should be operational
      const publicStatus = publicPage.locator(`[data-service="${TEST_SERVICE.name}"] .status`);
      await expect(publicStatus).toContainText('Operational');
      
      await publicPage.close();
    });

    // Step 5: Test embed widget
    await test.step('Test embed widget', async () => {
      // Get embed code
      await page.goto('/dashboard/services');
      await page.click(`[data-service-name="${TEST_SERVICE.name}"] button:has-text("Embed")`);
      
      const embedCode = await page.locator('.embed-code').textContent();
      expect(embedCode).toContain(`nest=${TEST_NEST.subdomain}`);
      
      // Create test page with embed
      const embedPage = await context.newPage();
      await embedPage.setContent(`
        <html>
          <body>
            <h1>Test Page</h1>
            ${embedCode}
          </body>
        </html>
      `);
      
      // Wait for widget to load
      await embedPage.waitForSelector('.guardant-widget', { timeout: 10000 });
      
      // Widget should show status
      const widgetStatus = embedPage.locator('.guardant-widget .service-status');
      await expect(widgetStatus).toBeVisible();
      
      await embedPage.close();
    });

    // Step 6: Test user management
    await test.step('Add team member', async () => {
      await page.goto('/dashboard/team');
      await page.click('text=Invite User');
      
      // Fill invite form
      const inviteEmail = `invited-${Date.now()}@example.com`;
      await page.fill('input[name="email"]', inviteEmail);
      await page.selectOption('select[name="role"]', 'viewer');
      
      await page.click('button:has-text("Send Invitation")');
      
      // Should show in team list
      await expect(page.locator(`text=${inviteEmail}`)).toBeVisible();
    });

    // Step 7: Test settings and subscription
    await test.step('Update nest settings', async () => {
      await page.goto('/dashboard/settings');
      
      // Update display name
      await page.fill('input[name="displayName"]', 'E2E Test Nest');
      await page.click('button:has-text("Save Settings")');
      
      // Should show success message
      await expect(page.locator('.toast-success')).toContainText('Settings updated');
      
      // Check subscription status
      await page.click('text=Subscription');
      await expect(page.locator('.subscription-tier')).toContainText('Free');
    });
  });

  test('Multi-region monitoring', async ({ page }) => {
    // Login with existing nest
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_NEST.email);
    await page.fill('input[name="password"]', TEST_NEST.password);
    await page.click('button[type="submit"]');
    
    // Create service with multi-region
    await page.goto('/dashboard/services/new');
    
    await page.fill('input[name="name"]', 'Multi-Region Service');
    await page.fill('input[name="url"]', 'https://httpstat.us/200');
    
    // Select multiple regions
    await page.check('input[value="us-east-1"]');
    await page.check('input[value="eu-west-1"]');
    await page.check('input[value="ap-southeast-1"]');
    
    await page.click('button:has-text("Create Service")');
    
    // Verify regions are active
    await page.click('text=Multi-Region Service');
    
    // Should show data from multiple regions
    await expect(page.locator('.region-selector')).toBeVisible();
    await expect(page.locator('text=us-east-1')).toBeVisible();
    await expect(page.locator('text=eu-west-1')).toBeVisible();
    await expect(page.locator('text=ap-southeast-1')).toBeVisible();
  });

  test('Incident management', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_NEST.email);
    await page.fill('input[name="password"]', TEST_NEST.password);
    await page.click('button[type="submit"]');
    
    // Create incident
    await page.goto('/dashboard/incidents');
    await page.click('text=Create Incident');
    
    await page.fill('input[name="title"]', 'E2E Test Incident');
    await page.fill('textarea[name="description"]', 'Testing incident creation');
    await page.selectOption('select[name="severity"]', 'minor');
    
    // Select affected service
    await page.check(`input[value="${TEST_SERVICE.name}"]`);
    
    await page.click('button:has-text("Create Incident")');
    
    // Should appear in incidents list
    await expect(page.locator('text=E2E Test Incident')).toBeVisible();
    
    // Update incident
    await page.click('text=E2E Test Incident');
    await page.click('text=Post Update');
    
    await page.fill('textarea[name="update"]', 'Issue has been identified');
    await page.selectOption('select[name="status"]', 'identified');
    await page.click('button:has-text("Post Update")');
    
    // Resolve incident
    await page.click('text=Resolve Incident');
    await page.fill('textarea[name="resolution"]', 'Issue has been resolved');
    await page.click('button:has-text("Resolve")');
    
    // Should show as resolved
    await expect(page.locator('.incident-status')).toContainText('Resolved');
  });

  test('Performance: Dashboard load time', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_NEST.email);
    await page.fill('input[name="password"]', TEST_NEST.password);
    await page.click('button[type="submit"]');
    
    // Measure dashboard load time
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // All critical elements should be visible
    await expect(page.locator('.services-overview')).toBeVisible();
    await expect(page.locator('.uptime-summary')).toBeVisible();
    await expect(page.locator('.recent-incidents')).toBeVisible();
  });

  test('Mobile responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Mobile menu should be visible
    await expect(page.locator('.mobile-menu-button')).toBeVisible();
    
    // Click mobile menu
    await page.click('.mobile-menu-button');
    
    // Navigation should be visible
    await expect(page.locator('nav.mobile-nav')).toBeVisible();
    
    // Test login on mobile
    await page.click('text=Login');
    await page.fill('input[name="email"]', TEST_NEST.email);
    await page.fill('input[name="password"]', TEST_NEST.password);
    await page.click('button[type="submit"]');
    
    // Dashboard should be mobile-optimized
    await expect(page.locator('.mobile-dashboard')).toBeVisible();
  });
});