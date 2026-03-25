import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ebizmarts.kefroxy',
  appName: "Roxy's Magic Reels",
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    backgroundColor: '#0c0a08',
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0c0a08',
      iosSpinnerStyle: 'small',
      spinnerColor: '#d4a0ff',
      showSpinner: true,
    },
  },
};

export default config;
