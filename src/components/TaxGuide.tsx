"use client";

import { useEffect, useState } from "react";

import TaxGuideEn from "@/components/TaxGuideEn";
import TaxGuideKo from "@/components/TaxGuideKo";

type Language = "ko" | "en";

const LANGUAGE_KEY = "taxguide:language";

function LanguageToggle({ language, onChange }: { language: Language; onChange: (next: Language) => void }) {
  return (
    <div
      className="fixed top-3 right-3 z-[80] rounded-xl p-1"
      style={{
        background: "rgba(247, 248, 250, 0.96)",
        border: "1px solid var(--rule)",
        boxShadow: "0 6px 24px rgba(18, 22, 26, 0.08)",
      }}
    >
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange("ko")}
          className="px-2.5 py-1 text-[12px] font-semibold rounded-md transition-colors"
          style={{
            border: "none",
            cursor: "pointer",
            color: language === "ko" ? "var(--paper)" : "var(--ink-muted)",
            background: language === "ko" ? "var(--ink)" : "transparent",
          }}
          aria-pressed={language === "ko"}
        >
          한국어
        </button>
        <button
          onClick={() => onChange("en")}
          className="px-2.5 py-1 text-[12px] font-semibold rounded-md transition-colors"
          style={{
            border: "none",
            cursor: "pointer",
            color: language === "en" ? "var(--paper)" : "var(--ink-muted)",
            background: language === "en" ? "var(--ink)" : "transparent",
          }}
          aria-pressed={language === "en"}
        >
          English
        </button>
      </div>
    </div>
  );
}

export default function TaxGuide({ initialLanguage }: { initialLanguage: Language }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
    document.cookie = `taxguide_lang=${language}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = language === "ko" ? "ko-KR" : "en-US";
  }, [language]);

  return (
    <>
      <LanguageToggle language={language} onChange={setLanguage} />
      {language === "ko" ? <TaxGuideKo /> : <TaxGuideEn />}
    </>
  );
}
