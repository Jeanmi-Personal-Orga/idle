import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brume.alchimiste',
  appName: "L'Alchimiste de Brume",
  webDir: 'dist',
  backgroundColor: '#0b1016',
  ios: { contentInset: 'never' },
  android: { backgroundColor: '#0b1016' },
};

export default config;
