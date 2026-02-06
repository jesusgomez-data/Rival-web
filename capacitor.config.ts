import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rivalfit.app',
  appName: 'Rival Fit',
  webDir: 'public',
  server: {
    url: 'https://rivalfit.app',
    cleartext: true
  }
};

export default config;
