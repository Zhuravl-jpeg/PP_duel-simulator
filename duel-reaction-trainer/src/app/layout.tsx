import type { Metadata } from "next";
import "./globals.css";
import { TRPCProvider } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Дуэльный тренажёр реакции",
  description: "Многопользовательский тренажёр реакции с общими раундами",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
