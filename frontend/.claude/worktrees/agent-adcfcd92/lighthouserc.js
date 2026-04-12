module.exports = {
    ci: {
        collect: {
            // URL to test (local dev server)
            url: ['http://localhost:3000'],
            numberOfRuns: 3,
            settings: {
                // Simulate mobile device
                preset: 'desktop',
                // Also test mobile separately
                onlyCategories: ['performance', 'accessibility', 'best-practices'],
                // Disable redirects
                skipAudits: ['redirects'],
            },
        },
        assert: {
            // Performance budgets
            assertions: {
                // Core Web Vitals
                'first-contentful-paint': ['error', { maxNumericValue: 2000 }], // 2s
                'largest-contentful-paint': ['error', { maxNumericValue: 3000 }], // 3s
                'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
                'total-blocking-time': ['error', { maxNumericValue: 300 }], // 300ms
                'speed-index': ['error', { maxNumericValue: 3500 }],
                'interactive': ['error', { maxNumericValue: 5000 }],

                // Resource budgets
                'resource-summary:script:size': ['error', { maxNumericValue: 153600 }], // 150kb
                'resource-summary:stylesheet:size': ['error', { maxNumericValue: 51200 }], // 50kb
                'resource-summary:image:size': ['error', { maxNumericValue: 204800 }], // 200kb
                'resource-summary:total:size': ['warn', { maxNumericValue: 512000 }], // 500kb total

                // Performance score
                'categories:performance': ['warn', { minScore: 0.9 }], // 90+
                'categories:accessibility': ['warn', { minScore: 0.9 }],
                'categories:best-practices': ['warn', { minScore: 0.9 }],
            },
        },
        upload: {
            // Store results locally for now
            target: 'temporary-public-storage',
        },
    },
};
