import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ambidex.game',
  appName: 'AmbidexGame',
  webDir: 'public',
  server: {
    androidScheme: 'http',
    allowMixedContent: true,
    cleartext: true
  }
};

export default config;
