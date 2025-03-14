export default {
  name: "Hardcase Fitness",
  slug: "hardcase-fitness-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  // Здесь определяем дополнительные переменные окружения
  extra: {
    // Это примерные значения, которые нужно заменить настоящими
    supabaseUrl: process.env.SUPABASE_URL || "https://your-supabase-url.supabase.co",
    supabaseKey: process.env.SUPABASE_KEY || "your-anon-key",
    eas: {
      projectId: "your-project-id"
    }
  }
}; 