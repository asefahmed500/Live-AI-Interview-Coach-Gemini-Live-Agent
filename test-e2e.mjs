// E2E Test Script for Vercel Frontend
import { chromium } from 'playwright';

const API_URL = 'https://live-interview-api-ywh3e45esq-uc.a.run.app';
const WEB_URL = 'https://web-taupe-theta-94.vercel.app';

async function runTests() {
  console.log('🚀 Starting E2E Tests...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Test 1: Homepage loads
  console.log('📍 Test 1: Loading Homepage...');
  await page.goto(WEB_URL, { waitUntil: 'networkidle' });
  const title = await page.title();
  console.log(`   ✓ Page title: ${title}`);
  
  // Check hero section
  const heroVisible = await page.locator('h1').isVisible();
  console.log(`   ✓ Hero section visible: ${heroVisible}`);
  
  // Test 2: Navigate to Auth page
  console.log('\n📍 Test 2: Navigate to Auth Page...');
  await page.click('a[href="/auth"]');
  await page.waitForURL('**/auth');
  console.log(`   ✓ Navigated to: ${page.url()}`);
  
  // Test 3: Sign Up
  console.log('\n📍 Test 3: Sign Up New User...');
  const timestamp = Date.now();
  const testUser = {
    name: 'Test User',
    email: `test${timestamp}@e2e.test`,
    password: 'TestPass123!'
  };
  
  // Click Sign Up button
  await page.click('button:has-text("Sign up")');
  await page.waitForTimeout(500);
  
  // Fill form
  await page.fill('input[placeholder*="Name"]', testUser.name);
  await page.fill('input[placeholder*="email"]', testUser.email);
  await page.fill('input[type="password"]', testUser.password);
  await page.fill('input[placeholder*="Confirm"]', testUser.password);
  
  // Submit form
  await page.click('button:has-text("Create account")');
  
  // Wait for response
  await page.waitForTimeout(3000);
  console.log(`   ✓ Sign up attempted for: ${testUser.email}`);
  
  // Check if we got redirected or there's an error
  const currentUrl = page.url();
  console.log(`   Current URL: ${currentUrl}`);
  
  // Test 4: Login
  console.log('\n📍 Test 4: Login...');
  if (currentUrl.includes('/auth')) {
    // Still on auth page, try login
    await page.fill('input[placeholder*="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(3000);
  }
  
  // Test 5: Check if we can access dashboard
  console.log('\n📍 Test 5: Check Dashboard Access...');
  const hasDashboardButton = await page.locator('a[href="/dashboard"]').count() > 0;
  console.log(`   Dashboard link present: ${hasDashboardButton}`);
  
  // Test 6: API Health Check
  console.log('\n📍 Test 6: Backend API Health Check...');
  const apiPage = await context.newPage();
  const response = await apiPage.goto(`${API_URL}/api/health`);
  const healthData = await response.json();
  console.log(`   ✓ API Status: ${healthData.status}`);
  console.log(`   ✓ MongoDB: ${healthData.data.services.mongodb.status}`);
  await apiPage.close();
  
  // Take screenshot
  await page.screenshot({ path: 'e2e-test-result.png', fullPage: true });
  console.log('\n📸 Screenshot saved: e2e-test-result.png');
  
  await browser.close();
  console.log('\n✅ All E2E Tests Completed!');
}

runTests().catch(console.error);
