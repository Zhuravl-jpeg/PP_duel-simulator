import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Цвета для визуального стимула
        signal: {
          idle: "#3b82f6",    // синий — ожидание
          ready: "#f59e0b",   // жёлтый — готов
          go: "#10b981",      // зелёный — нажми!
          falseStart: "#ef4444", // красный — фальстарт
        },
      },
    },
  },
  plugins: [],
};

export default config;
