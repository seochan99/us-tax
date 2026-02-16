import type { Metadata } from "next";
import { Noto_Sans_KR, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-serif",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "미국 세금 가이드 — 비자별 맞춤 세금 신고 안내서",
  description:
    "한국인을 위한 미국 세금 신고 가이드. F-1 유학생, J-1 연구원/학생, H-1B 취업, 동반비자(J-2/F-2/H-4) 비자별 맞춤 안내.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSansKR.variable} ${sourceSerif.variable} ${jetbrains.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
