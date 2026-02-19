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
const TITLE = "미국 세금 가이드 — 비자별·신분별 맞춤 세금 신고 안내서";
const DESCRIPTION =
  "한국인을 위한 미국 세금 신고 완벽 가이드. F-1 유학생, J-1 연구원/교환학생, H-1B 취업비자, L-1 주재원/파견, L-2 동반비자, E-2 투자/사업비자, 동반비자(F-2/J-2/H-4), 영주권자(Green Card), 시민권자 대상. SPT 거주자 판정부터 한미 조세조약, Totalization Agreement(사회보장협정), Form 1040/1040-NR, Form 8843, FBAR, FATCA, FTC/FEIE, Schedule C, Form 5472, Sprintax 사용법, 연방세·주세 신고, 환급 추적까지 8단계로 안내합니다.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  keywords: [
    // 한국어 핵심 키워드
    "미국 세금 신고",
    "미국 세금 신고 방법",
    "미국 세금 가이드",
    "미국 세금 환급",
    "유학생 세금 신고",
    "유학생 택스 리턴",
    "비거주자 세금 신고",
    "영주권자 세금 신고",
    "시민권자 세금 신고",
    "한국인 미국 세금",
    "미국 세금 신고 한국어",
    "조세조약",
    "한미 조세조약",
    "해외계좌 신고",
    "해외 금융계좌 보고",
    // 비자별
    "F-1 세금",
    "F1 비자 세금 신고",
    "J-1 세금",
    "J1 비자 세금 신고",
    "H-1B 세금",
    "H1B 비자 세금 신고",
    "동반비자 세금",
    "F-2 세금",
    "J-2 세금",
    "H-4 세금",
    "L-1 세금",
    "L1 비자 세금 신고",
    "L-2 세금",
    "E-2 세금",
    "E2 비자 세금 신고",
    "투자비자 세금",
    "사업비자 세금",
    "주재원 세금 신고",
    "파견 세금",
    "사회보장협정",
    "Totalization Agreement",
    // 영문 핵심 키워드
    "Tax Return",
    "1040-NR",
    "Form 1040",
    "Form 8843",
    "Sprintax",
    "TurboTax",
    "FBAR",
    "FATCA",
    "Form 8938",
    "Foreign Tax Credit",
    "FEIE",
    "SPT",
    "Substantial Presence Test",
    "nonresident alien tax",
    "OPT tax",
    "CPT tax",
    "FICA exemption",
    "tax treaty Korea",
    "Schedule C",
    "Form 5472",
    "self-employment tax",
    "E-2 visa tax",
    "treaty investor tax",
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
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    creator: "@seochan99",
  },
  alternates: {
    canonical: SITE_URL,
    languages: { "ko-KR": SITE_URL },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "finance",
  other: {
    "naver-site-verification": "placeholder",
    "google-site-verification": "7f6f9a9340efc29f",
  },
};

/* ---- JSON-LD Structured Data ---- */

const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "미국 세금 가이드",
  alternateName: "US Tax Guide for Koreans",
  url: SITE_URL,
  description: DESCRIPTION,
  inLanguage: "ko-KR",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const jsonLdWebPage = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: TITLE,
  description: DESCRIPTION,
  url: SITE_URL,
  inLanguage: "ko-KR",
  isPartOf: { "@type": "WebSite", url: SITE_URL },
  about: {
    "@type": "Thing",
    name: "미국 세금 신고",
    description: "한국인의 미국 세금 신고 절차",
  },
  audience: {
    "@type": "Audience",
    audienceType: "한국인 미국 거주자, 유학생, 취업비자 소지자, 주재원/파견(L-1/L-2), 투자/사업비자(E-2), 영주권자, 시민권자",
  },
  mainEntity: {
    "@type": "HowTo",
    name: "미국 세금 신고하는 방법 — 한국인 가이드",
    description:
      "한국인을 위한 미국 세금 신고 8단계 가이드. 비자 선택부터 거주자 판정, 조세조약, 서류 준비, 연방세·주세 신고, 제출, 환급 추적까지.",
    totalTime: "PT2H",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "시작하기",
        text: "본인의 비자 유형(F-1, J-1, H-1B, L-1, L-2, E-2, 동반비자) 또는 신분(영주권자, 시민권자)을 선택합니다.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "거주자 상태 확인",
        text: "Substantial Presence Test(SPT)를 통해 세법상 NRA(비거주자) 또는 RA(거주자)를 판정합니다.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "조세조약 확인",
        text: "한미 조세조약에 따른 면세 혜택(Article 20, 21)과 Saving Clause를 확인합니다.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "서류 준비",
        text: "W-2, 1042-S, 1099, I-94, 여권 등 필요 서류를 체크리스트로 확인하고 준비합니다.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "연방세 신고",
        text: "Form 1040(거주자) 또는 Form 1040-NR(비거주자)을 작성합니다. NRA는 Sprintax, RA는 TurboTax를 사용합니다.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "주세 신고",
        text: "거주 주에 State Tax를 별도로 신고합니다. 소득세 없는 주(TX, FL 등)는 신고 불필요합니다.",
      },
      {
        "@type": "HowToStep",
        position: 7,
        name: "서류 제출",
        text: "e-file 또는 USPS 우편으로 IRS에 연방세를, 주 세무서에 주세를 별도 제출합니다.",
      },
      {
        "@type": "HowToStep",
        position: 8,
        name: "환급 추적",
        text: "IRS Where's My Refund에서 SSN, Filing Status, Refund Amount로 환급 상태를 확인합니다.",
      },
    ],
  },
};

const jsonLdFAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "F-1 유학생은 미국에서 세금 신고를 해야 하나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "네, F-1 유학생은 소득 유무와 관계없이 매년 Form 8843을 제출해야 합니다. 소득이 있다면 Form 1040-NR도 함께 제출합니다. Sprintax를 사용하면 편리하게 작성할 수 있습니다.",
      },
    },
    {
      "@type": "Question",
      name: "H-1B 비자 소지자는 TurboTax를 사용할 수 있나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "대부분의 H-1B 소지자는 183일 이상 체류하여 RA(거주자)로 분류되므로 TurboTax, H&R Block 등 일반 세금 소프트웨어를 사용할 수 있습니다. 첫 해에 183일 미만 체류한 경우에는 NRA로서 Sprintax를 사용해야 합니다.",
      },
    },
    {
      "@type": "Question",
      name: "FBAR와 Form 8938의 차이점은 무엇인가요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "FBAR(FinCEN 114)는 해외 금융계좌 합산 $10,000 초과 시 FinCEN에 제출하고, Form 8938(FATCA)는 해외 금융자산이 일정 금액 초과 시 IRS에 세금 신고서와 함께 제출합니다. 두 보고 의무는 별도이며, 해당되면 둘 다 제출해야 합니다.",
      },
    },
    {
      "@type": "Question",
      name: "한미 조세조약으로 어떤 혜택을 받을 수 있나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "F-1/J-1 학생은 Article 21(1)에 따라 장학금·학비 면세 및 생활비 목적 소득 연 $2,000 면세 혜택을 받을 수 있습니다. J-1 연구원/교수는 Article 20(1)에 따라 교수·연구 소득 최대 2년간 전액 면세됩니다.",
      },
    },
    {
      "@type": "Question",
      name: "영주권자도 한국 소득을 미국에 신고해야 하나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "네, 영주권자와 시민권자는 전세계 소득(Worldwide Income)을 미국에 신고해야 합니다. 한국에서 발생한 급여, 이자, 배당, 부동산 소득 등 모든 소득을 Form 1040에 포함해야 하며, Foreign Tax Credit(FTC)으로 이중과세를 방지할 수 있습니다.",
      },
    },
    {
      "@type": "Question",
      name: "미국 세금 신고 마감일은 언제인가요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "연방세 신고 마감일은 매년 4월 15일입니다. NRA가 급여 원천징수 없이 우편 제출하는 경우 6월 15일까지 자동 연장됩니다. Form 4868을 제출하면 10월 15일까지 6개월 연장이 가능하지만, 세금 납부는 4월 15일까지 해야 합니다.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebPage) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFAQ) }}
        />

        {/* Google Analytics */}
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
