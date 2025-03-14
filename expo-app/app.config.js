export default {
  name: "HARDCASE",
  slug: "hardcase-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#4361ee"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.hardcase.mobile"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#4361ee"
    },
    package: "com.hardcase.mobile"
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  // Здесь определяем дополнительные переменные окружения
  extra: {
    supabaseUrl: "https://wyniaaklkkytpsabbciy.supabase.co",
    supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5bmlhYWtsa2t5dHBzYWJiY2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4MjAxODcsImV4cCI6MjA1NTM5NjE4N30.ORoTWSrHq7hgulN8VAMrhUgLnbN-yz1sLwTCjXpaAdI"
  }
}; 