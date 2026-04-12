/**
 * Sherpa-ONNX TTS Worker
 * Loads kitten-nano-en model individually (not from bundled .data file)
 * Based on k2-fsa/web-assembly-tts-sherpa-onnx-en demo
 */

// ─── Step 1: Configure Module BEFORE loading WASM ────────────────────────────
// The WASM JS checks: var Module = typeof Module !== "undefined" ? Module : {};
// So we must set Module on globalThis before importScripts.
var Module = {
    expectedDataFileDownloads: 0,
    locateFile: function (path) {
        // Worker is at /sherpa-onnx/, wasm is in same dir
        return path;
    },
    print: function (text) { console.log('[SherpaWorker]', text); },
    printErr: function (text) { console.error('[SherpaWorker]', text); },
    setStatus: function (status) {
        if (status) {
            postMessage({ type: 'sherpa-onnx-tts-progress', status: status });
        }
    },
    onRuntimeInitialized: function () {
        Module.isReady = true;
    }
};

// ─── Step 2: Load WASM module (patched: no .data file loader) ────────────────
importScripts('./sherpa-onnx-wasm-main-tts-nodata.js');

// ─── Step 3: Load TTS wrapper (uses Module for C bindings) ───────────────────
importScripts('./sherpa-onnx-tts.js');

// ─── State ───────────────────────────────────────────────────────────────────
var tts = null;

var MODEL_BASE = './kitten-nano-en-v0_1-fp16';

var ESPEAK_FILES = [
    'intonations', 'phondata', 'phondata-manifest', 'phonindex', 'phontab',
    'en_dict',
];

function fetchFile(url) {
    return fetch(url).then(function (resp) {
        if (!resp.ok) throw new Error('Failed to fetch ' + url + ': ' + resp.status);
        return resp.arrayBuffer();
    }).then(function (buf) {
        return new Uint8Array(buf);
    });
}

function postProgress(status) {
    postMessage({ type: 'sherpa-onnx-tts-progress', status: status });
}

function loadModelFiles() {
    postProgress('Downloading model...');

    // Sequential downloads using promise chain
    return fetchFile(MODEL_BASE + '/model.fp16.onnx').then(function (data) {
        Module.FS_createDataFile('/', 'model.onnx', data, true, true, true);
        console.log('[SherpaWorker] Loaded model.onnx (' + (data.length / 1024 / 1024).toFixed(1) + 'MB)');
        return fetchFile(MODEL_BASE + '/tokens.txt');
    }).then(function (data) {
        Module.FS_createDataFile('/', 'tokens.txt', data, true, true, true);
        return fetchFile(MODEL_BASE + '/voices.bin');
    }).then(function (data) {
        Module.FS_createDataFile('/', 'voices.bin', data, true, true, true);

        // Create espeak dirs
        Module.FS_createPath('/', 'espeak-ng-data', true, true);
        Module.FS_createPath('/espeak-ng-data', 'lang', true, true);
        Module.FS_createPath('/espeak-ng-data/lang', 'gmw', true, true);
        Module.FS_createPath('/espeak-ng-data', 'voices', true, true);
        Module.FS_createPath('/espeak-ng-data/voices', '!v', true, true);

        postProgress('Downloading phoneme data...');

        // Load espeak files sequentially
        var chain = Promise.resolve();
        ESPEAK_FILES.forEach(function (file) {
            chain = chain.then(function () {
                return fetchFile(MODEL_BASE + '/espeak-ng-data/' + file);
            }).then(function (fileData) {
                Module.FS_createDataFile('/espeak-ng-data', file, fileData, true, true, true);
            });
        });

        // Load English lang files
        chain = chain.then(function () {
            return fetchFile(MODEL_BASE + '/espeak-ng-data/lang/gmw/en');
        }).then(function (fileData) {
            Module.FS_createDataFile('/espeak-ng-data/lang/gmw', 'en', fileData, true, true, true);
            return fetchFile(MODEL_BASE + '/espeak-ng-data/lang/gmw/en-US');
        }).then(function (fileData) {
            Module.FS_createDataFile('/espeak-ng-data/lang/gmw', 'en-US', fileData, true, true, true);
        });

        return chain;
    });
}

function initTts() {
    postProgress('Waiting for WASM runtime...');

    // Wait for onRuntimeInitialized
    return new Promise(function (resolve) {
        function check() {
            if (Module.isReady) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        }
        check();
    }).then(function () {
        console.log('[SherpaWorker] WASM runtime ready');
        return loadModelFiles();
    }).then(function () {
        postProgress('Initializing TTS engine...');

        // Config must match the full nested structure expected by createOfflineTts
        // See sherpa-onnx-tts.js lines 875-890
        var config = {
            offlineTtsModelConfig: {
                offlineTtsVitsModelConfig: {
                    model: '',
                    lexicon: '',
                    tokens: '',
                    dataDir: '',
                    noiseScale: 0.667,
                    noiseScaleW: 0.8,
                    lengthScale: 1.0,
                },
                offlineTtsMatchaModelConfig: {
                    acousticModel: '',
                    vocoder: '',
                    lexicon: '',
                    tokens: '',
                    dataDir: '',
                    noiseScale: 0.667,
                    lengthScale: 1.0,
                },
                offlineTtsKokoroModelConfig: {
                    model: '',
                    voices: '',
                    tokens: '',
                    dataDir: '',
                    lengthScale: 1.0,
                    lexicon: '',
                    lang: '',
                },
                offlineTtsKittenModelConfig: {
                    model: '/model.onnx',
                    voices: '/voices.bin',
                    tokens: '/tokens.txt',
                    dataDir: '/espeak-ng-data',
                    lengthScale: 1.0,
                },
                numThreads: 1,
                debug: 0,
                provider: 'cpu',
            },
            ruleFsts: '',
            ruleFars: '',
            maxNumSentences: 3,
        };

        tts = createOfflineTts(Module, config);

        var numSpeakers = tts.numSpeakers;
        var sampleRate = tts.sampleRate;

        console.log('[SherpaWorker] TTS ready. Speakers: ' + numSpeakers + ', SampleRate: ' + sampleRate);
        postProgress('');

        postMessage({
            type: 'sherpa-onnx-tts-ready',
            numSpeakers: numSpeakers,
            sampleRate: sampleRate,
        });
    });
}

function generate(text, sid, speed, requestId) {
    if (!tts) {
        postMessage({ type: 'sherpa-onnx-tts-error', error: 'TTS not initialized', requestId: requestId });
        return;
    }

    var t0 = performance.now();
    var audio = tts.generate({ text: text, sid: sid, speed: speed });
    var elapsed = Math.round(performance.now() - t0);

    console.log('[SherpaWorker] Generated ' + audio.samples.length + ' samples in ' + elapsed + 'ms (req: ' + (requestId || 'n/a') + ')');

    postMessage({
        type: 'sherpa-onnx-tts-result',
        samples: audio.samples,
        sampleRate: audio.sampleRate,
        requestId: requestId,
    });
}

onmessage = function (e) {
    var type = e.data.type;

    if (type === 'init') {
        initTts().catch(function (err) {
            console.error('[SherpaWorker] Init failed:', err);
            postMessage({ type: 'sherpa-onnx-tts-error', error: err.message || String(err) });
        });
    } else if (type === 'generate') {
        try {
            generate(e.data.text, e.data.sid || 0, e.data.speed || 1.0, e.data.requestId);
        } catch (err) {
            console.error('[SherpaWorker] Generate failed:', err);
            postMessage({ type: 'sherpa-onnx-tts-error', error: err.message || String(err), requestId: e.data.requestId });
        }
    }
};
