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
  title: "J-1 세금 가이드 — 미국 세금 신고 안내서",
  description:
    "한국인 J-1 연구원/포닥을 위한 미국 세금 신고 단계별 안내서.",
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
