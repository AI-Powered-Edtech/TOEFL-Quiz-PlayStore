import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.toeflquiz.app',
  appName: 'TOEFL Quiz',
  webDir: 'dist',
  android: {
    // Require HTTPS for all loads — prevents mixed-content attacks
    allowMixedContent: false,
    captureInput: true,
    // IMPORTANT: Disable JS debugging in production builds
    webContentsDebuggingEnabled: false,
  },
  server: {
    // Use https:// scheme so Capacitor treats it as secure origin
    androidScheme: 'https',
  },
};

export default config;

