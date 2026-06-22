import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Разрешаем внешний доступ (для тестирования на других устройствах)
  allowedDevOrigins: ["*"],
};

export default nextConfig;
