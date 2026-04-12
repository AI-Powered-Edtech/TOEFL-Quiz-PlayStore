import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * Testing Mason feature and core app functionality
 */
export default defineConfig({
    testDir: './tests/e2e',

    // Test timeout (30s per test)
    timeout: 30 * 1000,

    // Run tests in parallel
    fullyParallel: true,

    // Fail build on CI if tests were accidentally left as .only
    forbidOnly: !!process.env.CI,

    // Retry failed tests once on CI
    retries: process.env.CI ? 1 : 0,

    // Limit workers on CI
    workers: process.env.CI ? 2 : undefined,

    // Reporter
    reporter: [
        ['html'],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['list']
    ],

    // Shared settings for all projects
    use: {
        // Base URL
        baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',

        // Collect trace on failure
        trace: 'on-first-retry',

        // Screenshot on failure
        screenshot: 'only-on-failure',

        // Video on failure
        video: 'retain-on-failure',
    },

    // Test projects for different browsers/viewports
    projects: [
        // Desktop Chrome
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },

        // Desktop Firefox
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },

        // Desktop Safari
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },

        // Mobile Chrome
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },

        // Mobile Safari
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
        },

        // Tablet
        {
            name: 'iPad',
            use: { ...devices['iPad Pro'] },
        },
    ],

    // Web server to run before tests
    webServer: process.env.SKIP_WEBSERVER ? undefined : {
        command: 'npm run dev',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000, // 2 minutes to start
    },
});
