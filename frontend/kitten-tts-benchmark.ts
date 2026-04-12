import { test } from '@playwright/test';
import { chromium } from 'playwright';

async function runTTSBenchmark() {
    console.log('🚀 Starting Kitten TTS Performance Benchmark...');

    const browser = await chromium.launch({ headless: true });

    // We must test against the actual dev server address where COOP/COEP are active
    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    try {
        console.log('🌐 Navigating to localhost:3000...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

        // Let React mount
        await page.waitForTimeout(2000);

        console.log('📚 Injecting TTS Benchmark script...');

        const result = await page.evaluate(async () => {
            // Give the app time to mount the TTS worker
            // We'll directly call the service to isolate JS performance from UI delays
            return new Promise(async (resolve, reject) => {
                try {
                    // Try to import the service dynamically
                    const modulePaths = [
                        '/src/services/ttsService.ts',
                        '/src/services/ttsService.tsx',
                        '/src/services/kittenTtsService.ts'
                    ];

                    // The easiest way to benchmark inside the browser environment without hacking the Vite build
                    // is to intercept the Web Worker messages or audio creation
                    let workerCreated = false;
                    const onnxLoaded = false;
                    const audioContextCreated = false;

                    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

                    // Override Worker globally to track initialization
                    const OriginalWorker = window.Worker;
                    window.Worker = function (scriptURL, options) {
                        workerCreated = true;
                        const w = new OriginalWorker(scriptURL, options);
                        return w;
                    } as any;

                    // Force the module load by interacting with the actual UI if possible,
                    // but since this is a unit benchmark, we'll try tracking the Audio element

                    resolve({
                        status: 'Injection applied, waiting for manual trigger or UI click'
                    });

                } catch (e) {
                    reject(e.toString());
                }
            });
        });

        console.log('Setup result:', result);
        console.log('Closing...');
    } catch (err) {
        console.error('Benchmark failed:', err);
    } finally {
        await browser.close();
    }
}

runTTSBenchmark();
