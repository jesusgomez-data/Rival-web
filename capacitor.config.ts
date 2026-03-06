import type { CapacitorConfig } from '@capacitor/cli';

const isProduction = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'com.rivalfit.app',
  appName: 'Rival Fit',
  webDir: 'out',
  server: {
    url: isProduction ? 'https://rivalfit.app' : 'http://localhost:3000',
    cleartext: !isProduction,
  },
};

export default config;
