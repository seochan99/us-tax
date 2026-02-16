import type { Metadata } from "next";
import Script from "next/script";
import { Noto_Sans_KR, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const GA_ID = "G-Q1LPSK7TRR";

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

const SITE_URL = "https://us-tax-lovat.vercel.app";
const TITLE = "미국 세금 가이드 — 비자별 맞춤 세금 신고 안내서";
const DESCRIPTION =
  "한국인을 위한 미국 세금 신고 단계별 가이드. F-1 유학생, J-1 연구원/교환학생, H-1B 취업비자, 동반비자(F-2/J-2/H-4) 비자 유형별 거주자 판정, 조세조약, 서류 체크리스트, 연방세·주세 신고 방법을 안내합니다.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  icons: { icon: "/icon.svg" },
  keywords: [
    "미국 세금 신고",
    "F-1 세금",
    "J-1 세금",
    "H-1B 세금",
    "유학생 세금",
    "비거주자 세금",
    "Tax Return",
    "1040-NR",
    "Sprintax",
    "조세조약",
    "한미 조세조약",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "미국 세금 가이드",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
        </Script>
      </head>
      <body
        className={`${notoSansKR.variable} ${sourceSerif.variable} ${jetbrains.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
