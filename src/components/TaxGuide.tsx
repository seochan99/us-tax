"use client";

import { useEffect, useState } from "react";

import TaxGuideEn from "@/components/TaxGuideEn";
import TaxGuideKo from "@/components/TaxGuideKo";

type Language = "ko" | "en";

const LANGUAGE_KEY = "taxguide:language";

export default function TaxGuide({ initialLanguage }: { initialLanguage: Language }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
    document.cookie = `taxguide_lang=${language}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = language === "ko" ? "ko-KR" : "en-US";
  }, [language]);

  return (
    language === "ko"
      ? <TaxGuideKo language={language} onLanguageChange={setLanguage} />
      : <TaxGuideEn language={language} onLanguageChange={setLanguage} />
  );
}
