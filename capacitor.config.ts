import type { CapacitorConfig } from '@capacitor/cli'

// Colors match SplashScreen.jsx's in-app launch moment (src/components/SplashScreen.jsx)
// so the native splash and the JS-rendered one that follows it read as one
// continuous transition instead of a color flash.
const config: CapacitorConfig = {
  appId: 'app.cleanconnect',
  appName: 'CleanConnect',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // native splash handed off instantly to SplashScreen.jsx, which owns the real animation/minimum-display timing
      backgroundColor: '#0D1117',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
}

export default config
