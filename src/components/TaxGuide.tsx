"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

/* ================================================================
   LOCAL STORAGE HELPERS
   ================================================================ */

const LS_KEYS = {
  step: "taxguide:step",
  checkedDocs: "taxguide:checkedDocs",
  arrivalYear: "taxguide:arrivalYear",
  visited: "taxguide:visited",
  visaType: "taxguide:visaType",
} as const;

function loadFromLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — ignore */ }
}

/* ================================================================
   DATA
   ================================================================ */

const STEPS = [
  "시작하기",
  "거주자 상태",
  "조세조약",
  "서류 준비",
  "연방세",
  "주세",
  "제출",
  "환급 추적",
];

type VisaType = "f1-student" | "j1-researcher" | "j1-student" | "h1b" | "dependent";

interface DocItem {
  id: string;
  label: string;
  desc: string;
}

interface VisaConfig {
  label: string;
  labelKo: string;
  desc: string;
  sptExemptYears: number;
  treatyArticle: string;
  treatyBenefit: string;
  ficaExempt: boolean;
  nraToolsOnly: boolean;
  docs: DocItem[];
  form8233: boolean;
}

const COMMON_DOCS: DocItem[] = [
  { id: "passport", label: "여권 (Passport)", desc: "유효한 여권 원본" },
  { id: "i94", label: "I-94 출입국 기록", desc: "i94.cbp.dhs.gov 에서 출력" },
  { id: "entrydates", label: "미국 입국/출국 날짜 (연도별)", desc: "여권 도장 또는 I-94 Travel History 에서 연도별 입출국일 확인" },
  { id: "ssn", label: "SSN (또는 ITIN)", desc: "Social Security Number. 없으면 ITIN(Form W-7)으로 대체 가능" },
  { id: "w2", label: "W-2", desc: "고용주 발급 (1~2월), 급여 및 원천징수 내역" },
  { id: "1042s", label: "1042-S (해당 시)", desc: "조세조약 적용 소득이 있는 경우" },
  { id: "1099int", label: "1099-INT (해당 시)", desc: "은행 이자 소득이 있는 경우" },
  { id: "1099div", label: "1099-DIV (해당 시)", desc: "배당금 소득이 있는 경우" },
  { id: "1099nec", label: "1099-NEC (해당 시)", desc: "독립 계약자(프리랜서) 소득이 있는 경우" },
  { id: "prev", label: "전년도 세금 신고서 사본", desc: "이전에 신고한 적이 있는 경우" },
];

const VISA_CONFIGS: Record<VisaType, VisaConfig> = {
  "f1-student": {
    label: "F-1 Student",
    labelKo: "유학생",
    desc: "F-1 비자로 미국에서 학업 중인 유학생",
    sptExemptYears: 5,
    treatyArticle: "Article 21(1)",
    treatyBenefit: "학비·장학금 면세, 생활비 목적 소득 연 $2,000까지 면세",
    ficaExempt: true,
    nraToolsOnly: true,
    docs: [
      { id: "passport", label: "여권 (Passport)", desc: "유효한 여권 원본" },
      { id: "i20", label: "I-20", desc: "학교에서 발급한 입학허가 서류" },
      { id: "i94", label: "I-94 출입국 기록", desc: "i94.cbp.dhs.gov 에서 출력" },
      { id: "entrydates", label: "미국 입국/출국 날짜 (연도별)", desc: "여권 도장 또는 I-94 Travel History 에서 연도별 입출국일 확인" },
      { id: "ssn", label: "SSN (또는 ITIN)", desc: "Social Security Number. 없으면 ITIN(Form W-7)으로 대체 가능" },
      { id: "w2", label: "W-2", desc: "고용주 발급 (1~2월), 급여 및 원천징수 내역" },
      { id: "1042s", label: "1042-S (해당 시)", desc: "조세조약 적용 소득이 있는 경우" },
      { id: "1099int", label: "1099-INT (해당 시)", desc: "은행 이자 소득이 있는 경우" },
      { id: "1099div", label: "1099-DIV (해당 시)", desc: "배당금 소득이 있는 경우" },
      { id: "1099nec", label: "1099-NEC (해당 시)", desc: "독립 계약자(프리랜서) 소득이 있는 경우" },
      { id: "prev", label: "전년도 세금 신고서 사본", desc: "이전에 신고한 적이 있는 경우" },
    ],
    form8233: true,
  },
  "j1-researcher": {
    label: "J-1 Researcher/Scholar",
    labelKo: "연구원/교수",
    desc: "J-1 비자로 미국에서 연구 또는 교수 활동 중인 방문연구원/교수",
    sptExemptYears: 2,
    treatyArticle: "Article 20(1)",
    treatyBenefit: "교수·연구 소득 전액 면세 (최대 2년)",
    ficaExempt: true,
    nraToolsOnly: true,
    docs: [
      { id: "passport", label: "여권 (Passport)", desc: "유효한 여권 원본" },
      { id: "ds2019", label: "DS-2019", desc: "J-1 스폰서 기관 발급 서류" },
      { id: "i94", label: "I-94 출입국 기록", desc: "i94.cbp.dhs.gov 에서 출력" },
      { id: "entrydates", label: "미국 입국/출국 날짜 (연도별)", desc: "여권 도장 또는 I-94 Travel History 에서 연도별 입출국일 확인" },
      { id: "ssn", label: "SSN (또는 ITIN)", desc: "Social Security Number. 없으면 ITIN(Form W-7)으로 대체 가능" },
      { id: "w2", label: "W-2", desc: "고용주 발급 (1~2월), 급여 및 원천징수 내역" },
      { id: "1042s", label: "1042-S (해당 시)", desc: "조세조약 적용 소득이 있는 경우" },
      { id: "1099int", label: "1099-INT (해당 시)", desc: "은행 이자 소득이 있는 경우" },
      { id: "1099div", label: "1099-DIV (해당 시)", desc: "배당금 소득이 있는 경우" },
      { id: "1099nec", label: "1099-NEC (해당 시)", desc: "독립 계약자(프리랜서) 소득이 있는 경우" },
      { id: "prev", label: "전년도 세금 신고서 사본", desc: "이전에 신고한 적이 있는 경우" },
    ],
    form8233: true,
  },
  "j1-student": {
    label: "J-1 Student",
    labelKo: "교환학생",
    desc: "J-1 비자로 미국에서 교환학생 프로그램에 참여 중인 학생",
    sptExemptYears: 5,
    treatyArticle: "Article 21(1)",
    treatyBenefit: "학비·장학금 면세, 생활비 목적 소득 연 $2,000까지 면세",
    ficaExempt: true,
    nraToolsOnly: true,
    docs: [
      { id: "passport", label: "여권 (Passport)", desc: "유효한 여권 원본" },
      { id: "ds2019", label: "DS-2019", desc: "J-1 스폰서 기관 발급 서류" },
      { id: "i94", label: "I-94 출입국 기록", desc: "i94.cbp.dhs.gov 에서 출력" },
      { id: "entrydates", label: "미국 입국/출국 날짜 (연도별)", desc: "여권 도장 또는 I-94 Travel History 에서 연도별 입출국일 확인" },
      { id: "ssn", label: "SSN (또는 ITIN)", desc: "Social Security Number. 없으면 ITIN(Form W-7)으로 대체 가능" },
      { id: "w2", label: "W-2", desc: "고용주 발급 (1~2월), 급여 및 원천징수 내역" },
      { id: "1042s", label: "1042-S (해당 시)", desc: "조세조약 적용 소득이 있는 경우" },
      { id: "1099int", label: "1099-INT (해당 시)", desc: "은행 이자 소득이 있는 경우" },
      { id: "1099div", label: "1099-DIV (해당 시)", desc: "배당금 소득이 있는 경우" },
      { id: "1099nec", label: "1099-NEC (해당 시)", desc: "독립 계약자(프리랜서) 소득이 있는 경우" },
      { id: "prev", label: "전년도 세금 신고서 사본", desc: "이전에 신고한 적이 있는 경우" },
    ],
    form8233: true,
  },
  "h1b": {
    label: "H-1B Worker",
    labelKo: "취업비자",
    desc: "H-1B 비자로 미국에서 취업 중인 근로자",
    sptExemptYears: 0,
    treatyArticle: "Article 20(1)",
    treatyBenefit: "대학에서 교수/연구직인 경우에만 교수·연구 소득 면세 가능",
    ficaExempt: false,
    nraToolsOnly: false,
    docs: [
      { id: "passport", label: "여권 (Passport)", desc: "유효한 여권 원본" },
      { id: "i94", label: "I-94 출입국 기록", desc: "i94.cbp.dhs.gov 에서 출력" },
      { id: "entrydates", label: "미국 입국/출국 날짜 (연도별)", desc: "여권 도장 또는 I-94 Travel History 에서 연도별 입출국일 확인" },
      { id: "ssn", label: "SSN", desc: "Social Security Number (H-1B는 SSN 발급 대상)" },
      { id: "w2", label: "W-2", desc: "고용주 발급 (1~2월), 급여 및 원천징수 내역" },
      { id: "1099int", label: "1099-INT (해당 시)", desc: "은행 이자 소득이 있는 경우" },
      { id: "1099div", label: "1099-DIV (해당 시)", desc: "배당금 소득이 있는 경우" },
      { id: "1099nec", label: "1099-NEC (해당 시)", desc: "독립 계약자(프리랜서) 소득이 있는 경우" },
      { id: "prev", label: "전년도 세금 신고서 사본", desc: "이전에 신고한 적이 있는 경우" },
    ],
    form8233: false,
  },
  "dependent": {
    label: "Dependent (J-2/F-2/H-4)",
    labelKo: "동반비자",
    desc: "J-2, F-2, H-4 등 동반비자 소지자",
    sptExemptYears: 0,
    treatyArticle: "",
    treatyBenefit: "동반비자 본인에게는 별도의 조세조약 혜택이 적용되지 않습니다",
    ficaExempt: false,
    nraToolsOnly: false,
    docs: [
      { id: "passport", label: "여권 (Passport)", desc: "유효한 여권 원본" },
      { id: "i94", label: "I-94 출입국 기록", desc: "i94.cbp.dhs.gov 에서 출력" },
      { id: "entrydates", label: "미국 입국/출국 날짜 (연도별)", desc: "여권 도장 또는 I-94 Travel History 에서 연도별 입출국일 확인" },
      { id: "primarydocs", label: "주비자 소지자의 비자 서류 사본", desc: "배우자/부모의 DS-2019, I-20, 또는 I-797 사본" },
      { id: "ead", label: "EAD (해당 시)", desc: "Employment Authorization Document — 근로 허가증 (취업한 경우)" },
      { id: "ssn", label: "SSN (또는 ITIN)", desc: "취업 중이면 SSN, 아니면 ITIN(Form W-7)으로 대체 가능" },
      { id: "w2", label: "W-2 (해당 시)", desc: "취업한 경우 고용주 발급 급여 내역" },
      { id: "prev", label: "전년도 세금 신고서 사본", desc: "이전에 신고한 적이 있는 경우" },
    ],
    form8233: false,
  },
};

const NO_TAX_STATES = [
  "Alaska", "Florida", "Nevada", "New Hampshire",
  "South Dakota", "Tennessee", "Texas", "Washington", "Wyoming",
];

/* ================================================================
   UI PRIMITIVES
   ================================================================ */

function T({ children, tip }: { children: ReactNode; tip: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; arrowLeft: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const reposition = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const tipW = Math.min(300, window.innerWidth - 32);
    let left = rect.left + rect.width / 2 - tipW / 2;
    const arrowIdeal = tipW / 2;
    let arrowLeft = arrowIdeal;

    // clamp horizontally
    if (left < 16) {
      arrowLeft = arrowIdeal + (left - 16);
      left = 16;
    } else if (left + tipW > window.innerWidth - 16) {
      const overflow = left + tipW - (window.innerWidth - 16);
      arrowLeft = arrowIdeal + overflow;
      left = window.innerWidth - 16 - tipW;
    }
    arrowLeft = Math.max(12, Math.min(tipW - 12, arrowLeft));

    // place above trigger; if not enough space, place below
    let top = rect.top - 10;
    setPos({ top, left, arrowLeft });
  }, []);

  const handleOpen = useCallback(() => {
    reposition();
    setOpen(true);
  }, [reposition]);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <span
        ref={ref}
        className={`term-tooltip${open ? " tt-open" : ""}`}
        tabIndex={0}
        role="button"
        aria-label={`${typeof children === "string" ? children : "용어"} 설명 보기`}
        onClick={(e) => {
          e.stopPropagation();
          if (open) handleClose();
          else handleOpen();
        }}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (open) handleClose();
            else handleOpen();
          }
          if (e.key === "Escape") handleClose();
        }}
      >
        {children}
      </span>
      {mounted && open && pos && createPortal(
        <span
          ref={tipRef}
          className="tt-portal"
          role="tooltip"
          style={{
            position: "fixed",
            bottom: `${window.innerHeight - pos.top}px`,
            left: `${pos.left}px`,
            zIndex: 9998,
          }}
        >
          {tip}
          <span className="tt-arrow" style={{ left: `${pos.arrowLeft}px` }} />
        </span>,
        document.body
      )}
    </>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code
      className="font-[family-name:var(--font-mono)] text-[0.85em] px-1.5 py-0.5 rounded"
      style={{ background: "var(--rule-light)", color: "var(--accent)" }}
    >
      {children}
    </code>
  );
}

function Callout({
  type,
  label,
  children,
}: {
  type: "warn" | "info" | "tip";
  label?: string;
  children: ReactNode;
}) {
  const styles = {
    warn: {
      border: "var(--accent)",
      bg: "var(--accent-bg)",
      text: "var(--accent)",
      labelBg: "var(--accent)",
    },
    info: {
      border: "var(--rule)",
      bg: "var(--paper)",
      text: "var(--ink-light)",
      labelBg: "var(--ink)",
    },
    tip: {
      border: "var(--moss)",
      bg: "var(--moss-bg)",
      text: "var(--moss)",
      labelBg: "var(--moss)",
    },
  };
  const s = styles[type];

  return (
    <div
      className="my-6"
      style={{ borderLeft: `3px solid ${s.border}`, background: s.bg }}
    >
      <div className="px-5 py-4">
        {label && (
          <span
            className="inline-block text-[11px] font-[family-name:var(--font-mono)] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded-sm mb-2"
            style={{ background: s.labelBg }}
          >
            {label}
          </span>
        )}
        <div
          className="text-sm leading-relaxed"
          style={{ color: s.text }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3
      className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.15em] mt-10 mb-4 pb-2"
      style={{ color: "var(--ink-muted)", borderBottom: "1px solid var(--rule)" }}
    >
      {children}
    </h3>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="text-[15px] leading-[1.8]" style={{ color: "var(--ink-light)" }}>
      {children}
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function TaxGuide() {
  const [step, setStep] = useState(() => loadFromLS(LS_KEYS.step, 0));
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(
    () => new Set(loadFromLS<string[]>(LS_KEYS.checkedDocs, [])),
  );
  const [arrivalYear, setArrivalYear] = useState(() =>
    loadFromLS(LS_KEYS.arrivalYear, ""),
  );
  const [visited, setVisited] = useState<Set<number>>(
    () => new Set(loadFromLS<number[]>(LS_KEYS.visited, [0])),
  );
  const [visaType, setVisaType] = useState<VisaType | "">(() =>
    loadFromLS<VisaType | "">(LS_KEYS.visaType, ""),
  );

  /* Persist to localStorage on change */
  useEffect(() => { saveToLS(LS_KEYS.step, step); }, [step]);
  useEffect(() => { saveToLS(LS_KEYS.checkedDocs, [...checkedDocs]); }, [checkedDocs]);
  useEffect(() => { saveToLS(LS_KEYS.arrivalYear, arrivalYear); }, [arrivalYear]);
  useEffect(() => { saveToLS(LS_KEYS.visited, [...visited]); }, [visited]);
  useEffect(() => { saveToLS(LS_KEYS.visaType, visaType); }, [visaType]);

  const goTo = (s: number) => {
    setStep(s);
    setVisited((prev) => new Set(prev).add(s));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goNext = () => goTo(Math.min(step + 1, STEPS.length - 1));
  const goPrev = () => goTo(Math.max(step - 1, 0));

  const toggleDoc = (id: string) => {
    setCheckedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const arrivalNum = parseInt(arrivalYear);
  const isValidYear = !isNaN(arrivalNum) && arrivalNum >= 2015 && arrivalNum <= 2026;
  const visa = visaType ? VISA_CONFIGS[visaType] : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ---- Top bar ---- */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{
          background: "rgba(247, 248, 250, 0.85)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div className="max-w-[680px] mx-auto px-5 sm:px-8 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.12em] uppercase"
              style={{ color: "var(--ink-muted)" }}
            >
              미국 세금 가이드
            </span>
            {visa && (
              <span
                className="font-[family-name:var(--font-mono)] text-[10px] font-bold px-1.5 py-0.5 rounded-sm"
                style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
              >
                {visa.label}
              </span>
            )}
          </div>
          <span
            className="font-[family-name:var(--font-mono)] text-[11px] tabular-nums"
            style={{ color: "var(--ink-faint)" }}
          >
            {String(step + 1).padStart(2, "0")}/{String(STEPS.length).padStart(2, "0")}
          </span>
        </div>
        {/* progress */}
        <div className="h-[2px]" style={{ background: "var(--rule-light)" }}>
          <div
            className="h-full transition-all duration-700 ease-out"
            style={{
              width: `${((step + 1) / STEPS.length) * 100}%`,
              background: "var(--accent)",
            }}
          />
        </div>
      </header>

      <div className="max-w-[680px] mx-auto px-5 sm:px-8">
        {/* ---- Step nav (desktop) ---- */}
        <nav
          className="hidden md:flex items-center gap-0 pt-8 pb-2 overflow-x-auto"
          style={{ borderBottom: "1px solid var(--rule)" }}
        >
          {STEPS.map((title, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="relative px-3 py-2 text-[12.5px] font-medium transition-colors whitespace-nowrap"
              style={{
                color: i === step ? "var(--accent)" : visited.has(i) ? "var(--ink-light)" : "var(--ink-faint)",
              }}
            >
              <span className="font-[family-name:var(--font-mono)] mr-1.5" style={{ fontSize: "10px" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {title}
              {i === step && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-[2px]"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* ---- Mobile step label ---- */}
        <div className="md:hidden pt-8">
          <span
            className="font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.12em] uppercase"
            style={{ color: "var(--accent)" }}
          >
            Step {String(step + 1).padStart(2, "0")}
          </span>
        </div>

        {/* ---- Content ---- */}
        <main className="pt-8 pb-32 animate-step" key={`${step}-${visaType}`}>
          {step === 0 && <Step0 />}
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
          {step === 4 && <Step4 />}
          {step === 5 && <Step5 />}
          {step === 6 && <Step6 />}
          {step === 7 && <Step7 />}
        </main>

        {/* ---- Footer nav ---- */}
        <div
          className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md"
          style={{
            background: "rgba(247, 248, 250, 0.9)",
            borderTop: "1px solid var(--rule)",
          }}
        >
          <div className="max-w-[680px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={step === 0}
              className="text-sm font-medium transition-opacity"
              style={{
                color: step === 0 ? "var(--ink-faint)" : "var(--ink-light)",
                opacity: step === 0 ? 0.4 : 1,
                cursor: step === 0 ? "default" : "pointer",
              }}
            >
              &larr; 이전
            </button>

            {/* dot indicators */}
            <div className="flex items-center gap-[6px]">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="transition-all duration-300"
                  style={{
                    width: i === step ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === step ? "var(--accent)" : visited.has(i) ? "var(--ink-faint)" : "var(--rule)",
                  }}
                />
              ))}
            </div>

            <button
              onClick={step === STEPS.length - 1 ? () => goTo(0) : goNext}
              className="text-sm font-medium"
              style={{ color: "var(--accent)" }}
            >
              {step === STEPS.length - 1 ? "처음으로" : "다음 \u2192"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ==============================================================
     STEP 0 — 시작하기
     ============================================================== */

  function Step0() {
    const visaOptions: { key: VisaType; label: string; labelKo: string }[] = [
      { key: "f1-student", label: "F-1", labelKo: "유학생" },
      { key: "j1-researcher", label: "J-1", labelKo: "연구원/교수" },
      { key: "j1-student", label: "J-1", labelKo: "교환학생" },
      { key: "h1b", label: "H-1B", labelKo: "취업비자" },
      { key: "dependent", label: "동반비자", labelKo: "J-2/F-2/H-4" },
    ];

    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(28px,5vw,42px)] font-black leading-[1.15] tracking-tight mb-3"
          style={{ color: "var(--ink)" }}
        >
          미국 세금 신고,
          <br />
          처음이라 막막한 당신을 위해.
        </h1>
        <p className="text-[15px] mb-10" style={{ color: "var(--ink-muted)" }}>
          한국인 비자 소지자를 위한 단계별 세금 신고 안내서
        </p>

        {/* ---- Visa selector ---- */}
        <SectionLabel>본인의 비자를 선택하세요</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
          {visaOptions.map((opt) => {
            const selected = visaType === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => {
                  setVisaType(opt.key);
                  setCheckedDocs(new Set());
                }}
                className="text-left p-4 transition-all"
                style={{
                  background: selected ? "var(--ink)" : "var(--paper)",
                  border: `1.5px solid ${selected ? "var(--ink)" : "var(--rule)"}`,
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                <p
                  className="font-[family-name:var(--font-mono)] text-[12px] font-bold uppercase tracking-wide mb-1"
                  style={{ color: selected ? "var(--accent-soft)" : "var(--accent)" }}
                >
                  {opt.label}
                </p>
                <p
                  className="text-[14px] font-medium"
                  style={{ color: selected ? "var(--paper)" : "var(--ink)" }}
                >
                  {opt.labelKo}
                </p>
              </button>
            );
          })}
        </div>

        {!visaType && (
          <Callout type="info" label="안내">
            비자를 선택하면 해당 비자에 맞는 맞춤형 세금 가이드가 표시됩니다.
          </Callout>
        )}

        {visa && (
          <>
            <Callout type="tip" label={`${visa.label} ${visa.labelKo}`}>
              {visa.desc}
            </Callout>

            <Callout type="info" label="핵심 개념">
              <strong>&ldquo;세금 신고(Tax Return)&rdquo; &ne; &ldquo;환급(Refund)&rdquo;</strong>
              <br /><br />
              세금 신고(Tax Return)는 <strong>지난해 소득을 IRS에 보고하는 절차</strong>이며, 모든 해당자가 의무적으로 해야 합니다.
              환급(Refund)은 원천징수된 세금 중 초과 납부분을 돌려받는 것으로, 신고 결과에 따라 <strong>환급이 없거나 오히려 추가 납부</strong>할 수도 있습니다.
            </Callout>

            {/* Key numbers */}
            <div
              className="grid grid-cols-3 gap-px my-10 overflow-hidden"
              style={{ background: "var(--rule)", borderRadius: 2 }}
            >
              {[
                { label: "신고 대상", value: "2025", sub: "2025 Tax Year 소득" },
                { label: "기본 마감일", value: "4.15", sub: "2026년 4월 15일 (수)" },
                { label: "비용", value: visaType === "h1b" ? "$0–50" : "$0–35", sub: "도구 사용료" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="text-center py-5 px-3"
                  style={{ background: "var(--paper)" }}
                >
                  <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>
                    {item.label}
                  </p>
                  <p className="font-[family-name:var(--font-serif)] text-[28px] font-black leading-none" style={{ color: "var(--accent)" }}>
                    {item.value}
                  </p>
                  <p className="text-[11px] mt-1.5" style={{ color: "var(--ink-faint)" }}>
                    {item.sub}
                  </p>
                </div>
              ))}
            </div>

            <Callout type="warn" label="2026년에 처음 도착?">
              <strong>2026년에 미국에 처음 도착한 분은 지금 할 게 없습니다.</strong>
              <br />
              2026년에 번 소득은 <strong>2027년 봄</strong>에 신고합니다.
              지금(2026년 봄)에 신고해야 하는 것은 <strong>2025년 소득</strong>입니다.
            </Callout>

            <SectionLabel>마감일 정리</SectionLabel>
            <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
              {[
                {
                  case_: "급여 소득(W-2)이 있는 경우",
                  date: "2026년 4월 15일",
                  note: "원천징수된 wages가 있으면 4/15 마감",
                },
                {
                  case_: "미국 내 소득은 있으나 wages 원천징수가 없는 경우",
                  date: "2026년 6월 15일",
                  note: "자동 2개월 연장 (별도 신청 불필요)",
                },
                {
                  case_: "소득 없이 Form 8843만 제출",
                  date: "2026년 6월 15일",
                  note: "8843은 정보 보고 양식이라 6/15 마감",
                },
              ].map((item) => (
                <div
                  key={item.case_}
                  className="flex flex-col gap-1 py-3.5"
                  style={{ borderBottom: "1px solid var(--rule-light)" }}
                >
                  <p className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                    {item.case_}
                  </p>
                  <div className="flex items-center gap-3">
                    <span
                      className="font-[family-name:var(--font-mono)] text-[13px] font-bold"
                      style={{ color: "var(--accent)" }}
                    >
                      {item.date}
                    </span>
                    <span className="text-[12px]" style={{ color: "var(--ink-faint)" }}>
                      {item.note}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 3 cases — customized per visa */}
            <SectionLabel>신고 케이스</SectionLabel>
            <Prose>
              <p className="mb-4">본인 상황에 따라 제출하는 양식이 다릅니다:</p>
            </Prose>
            <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
              {visaType === "h1b" ? (
                <>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--accent)" }}>Case 1</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip="Resident Alien — 미국 세법상 거주 외국인. H-1B는 SPT 면제가 없으므로 183일 이상 체류하면 바로 RA입니다.">RA</T> (대부분의 H-1B)
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <T tip="미국 시민 및 RA가 사용하는 표준 소득세 신고 양식."><Code>Form 1040</Code></T> 제출 — TurboTax, H&R Block 등 사용 가능
                    </p>
                  </div>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--ink-muted)" }}>Case 2</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip="Non-Resident Alien — 미국 세법상 비거주 외국인. H-1B 첫 해에 183일 미만 체류한 경우에 해당합니다.">NRA</T> (첫 해 부분 연도)
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <T tip="NRA가 미국 소득을 신고할 때 사용하는 IRS 양식."><Code>Form 1040-NR</Code></T> 제출, 또는{" "}
                      <T tip="First-Year Choice — H-1B 첫 해에 일부 기간만 체류한 경우, 도착일부터 RA로 취급해달라고 선택할 수 있는 제도.">First-Year Choice Election</T>으로 1040 사용 가능
                    </p>
                  </div>
                </>
              ) : visaType === "dependent" ? (
                <>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--accent)" }}>Case 1</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip="Non-Resident Alien — 미국 세법상 비거주 외국인.">NRA</T> + 소득 없음
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <T tip="미국에 체류한 모든 NRA가 제출하는 정보 보고 양식."><Code>Form 8843</Code></T>만 제출 — 동반비자도 개별적으로 반드시 제출
                    </p>
                  </div>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--ink-muted)" }}>Case 2</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip="Non-Resident Alien — 미국 세법상 비거주 외국인.">NRA</T> + EAD로 취업 중
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <Code>Form 1040-NR</Code> + <Code>Form 8843</Code> 함께 제출
                    </p>
                  </div>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--ink-muted)" }}>Case 3</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip="Resident Alien — 미국 세법상 거주 외국인.">RA</T> (주비자 소지자와 동일 상태)
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <Code>Form 1040</Code> 제출 (TurboTax 등 사용 가능)
                    </p>
                  </div>
                </>
              ) : (
                /* F-1, J-1 Researcher, J-1 Student */
                <>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--accent)" }}>Case 1</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip={`Non-Resident Alien — 미국 세법상 비거주 외국인. ${visa.label}는 처음 ${visa.sptExemptYears} calendar year 동안 NRA입니다.`}>NRA</T> + 소득 없음
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <T tip="미국에 체류한 모든 NRA가 제출하는 정보 보고 양식. 소득이 없어도 필수입니다.">
                        <Code>Form 8843</Code>
                      </T>
                      만 제출 (<T tip="Social Security Number — 미국 사회보장번호 (9자리).">SSN</T>/<T tip="Individual Taxpayer Identification Number — SSN 대신 사용하는 납세자 번호. Form W-7로 신청합니다.">ITIN</T> 없어도 가능)
                    </p>
                  </div>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--accent)" }}>Case 2</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip="Non-Resident Alien — 미국 세법상 비거주 외국인.">NRA</T> + 미국 소득 있음
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <T tip="NRA가 미국 소득을 신고할 때 사용하는 IRS 양식."><Code>Form 1040-NR</Code></T>{" "}+{" "}
                      <T tip="NRA 필수 정보 보고 양식. 1040-NR과 함께 제출합니다."><Code>Form 8843</Code></T> 함께 제출
                    </p>
                  </div>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--ink-muted)" }}>Case 3</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip="Resident Alien — 미국 세법상 거주 외국인. SPT 면제 기간이 끝나면 RA로 전환됩니다.">RA</T> (거주자 전환)
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <T tip="미국 시민 및 RA가 사용하는 표준 소득세 신고 양식."><Code>Form 1040</Code></T> 제출 (<T tip="미국에서 가장 많이 쓰는 세금 신고 소프트웨어. RA만 사용 가능합니다.">TurboTax</T> 등 사용 가능)
                    </p>
                  </div>
                </>
              )}
            </div>

            <SectionLabel>이 가이드에서 다루는 내용</SectionLabel>
            <div className="space-y-3">
              {[
                "세금 목적 거주자 상태(NRA/RA) 판단",
                "한미 조세조약에 따른 소득세 면제 혜택",
                "필요 서류 체크리스트",
                "연방세(Federal Tax) 신고 방법",
                "주세(State Tax) 신고 방법",
                "서류 제출 및 환급(리펀드) 추적",
              ].map((item, i) => (
                <div key={i} className="flex items-baseline gap-3">
                  <span className="font-[family-name:var(--font-mono)] text-[11px] font-bold" style={{ color: "var(--ink-faint)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[15px]" style={{ color: "var(--ink-light)" }}>{item}</span>
                </div>
              ))}
            </div>

            <SectionLabel>도착 연도 선택</SectionLabel>
            <Prose>
              <p className="mb-3">
                {visaType === "h1b"
                  ? "RA/NRA 판단 및 세금 가이드 계산에 사용됩니다."
                  : "조세조약 면세 기간 계산에 사용됩니다."}
              </p>
            </Prose>
            <div className="flex items-center gap-4">
              <select
                value={arrivalYear}
                onChange={(e) => setArrivalYear(e.target.value)}
                className="px-3 py-2.5 text-[15px] font-[family-name:var(--font-mono)] font-bold outline-none transition-colors cursor-pointer"
                style={{
                  background: "var(--paper)",
                  border: "1.5px solid var(--rule)",
                  color: arrivalYear ? "var(--ink)" : "var(--ink-faint)",
                  borderRadius: 4,
                  WebkitAppearance: "none",
                  appearance: "none",
                  paddingRight: 32,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23848075' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--rule)")}
              >
                <option value="">선택하세요</option>
                {Array.from({ length: 12 }, (_, i) => 2026 - i).map((y) => (
                  <option key={y} value={String(y)}>
                    {y}년
                  </option>
                ))}
              </select>
              {isValidYear && (
                <span className="text-sm" style={{ color: "var(--moss)" }}>
                  {arrivalNum}년 기준으로 안내합니다
                </span>
              )}
            </div>

            <Callout type="warn" label="주의">
              이 가이드는 일반적인 정보 제공 목적이며 전문 세무 상담을 대체하지 않습니다. 개인 상황에 따라 다를 수 있으므로 복잡한 경우 세무사 상담을 권장합니다.
            </Callout>
          </>
        )}
      </>
    );
  }

  /* ==============================================================
     STEP 1 — 거주자 상태 확인
     ============================================================== */

  function Step1() {
    if (!visa) return <VisaPrompt />;

    const exemptYears = visa.sptExemptYears;
    const isH1B = visaType === "h1b";
    const isDependent = visaType === "dependent";
    const isStudent = visaType === "f1-student" || visaType === "j1-student";

    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}
        >
          세금 목적 거주자 상태 확인
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          <T tip="Non-Resident Alien. 미국 세법상 비거주 외국인을 뜻합니다.">NRA</T> vs{" "}
          <T tip="Resident Alien. 미국 세법상 거주 외국인을 뜻합니다.">RA</T> — 어떤 양식을 쓸지 결정하는 첫 번째 단계
        </p>

        <Prose>
          <p>
            미국 세법에서 &ldquo;거주자&rdquo;와 &ldquo;비거주자&rdquo;는 이민법의 정의와{" "}
            <strong>다릅니다</strong>. 세금 목적의 거주자 상태에 따라 사용하는 양식이 달라집니다.
          </p>
        </Prose>

        {/* NRA vs RA comparison */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-px my-8 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}
        >
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p
              className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-4"
              style={{ color: "var(--accent)" }}
            >
              NRA (비거주자)
            </p>
            <ul className="space-y-2.5 text-[14px]" style={{ color: "var(--ink-light)" }}>
              <li>
                <T tip="NRA가 미국 소득을 신고할 때 사용하는 IRS 양식.">
                  <Code>Form 1040-NR</Code>
                </T>{" "}사용
              </li>
              <li>
                <T tip="미국에 체류한 모든 NRA가 제출하는 정보 보고 양식. 소득이 없어도 필수입니다.">
                  <Code>Form 8843</Code>
                </T>{" "}필수 제출
              </li>
              <li>
                {visa.ficaExempt
                  ? <><T tip="Federal Insurance Contributions Act. 사회보장세(Social Security 6.2%)와 메디케어세(Medicare 1.45%)를 합친 명칭.">FICA</T> 면제</>
                  : <><T tip="Federal Insurance Contributions Act. 사회보장세(Social Security 6.2%)와 메디케어세(Medicare 1.45%)를 합친 명칭.">FICA</T> 납부 대상</>
                }
              </li>
              <li>
                <T tip="NRA 전용 세금 신고 소프트웨어들. 학교에서 무료 코드를 제공하는 경우가 많습니다.">Sprintax / GLACIER Tax Prep</T>
              </li>
            </ul>
          </div>
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p
              className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-4"
              style={{ color: "var(--ink-muted)" }}
            >
              RA (거주자)
            </p>
            <ul className="space-y-2.5 text-[14px]" style={{ color: "var(--ink-muted)" }}>
              <li>
                <T tip="미국 시민 및 거주 외국인(RA)이 사용하는 표준 소득세 신고 양식.">
                  <Code>Form 1040</Code>
                </T>{" "}사용
              </li>
              <li>
                <T tip="미국에서 가장 많이 쓰는 세금 신고 소프트웨어들. RA(거주 외국인)만 사용 가능합니다.">TurboTax, H&R Block</T> 사용 가능
              </li>
              <li>
                <T tip="Federal Insurance Contributions Act. RA는 Social Security(6.2%)와 Medicare(1.45%)를 납부해야 합니다.">FICA</T> 납부 대상
              </li>
              <li>일반 시민과 동일한 절차</li>
            </ul>
          </div>
        </div>

        <SectionLabel>Substantial Presence Test (SPT)</SectionLabel>
        <Prose>
          <p>
            IRS는{" "}
            <T tip="미국에서의 물리적 체류 일수로 세금 거주자 여부를 판단하는 테스트.">
              Substantial Presence Test (SPT)
            </T>
            를 통해 세금 목적의 거주자 여부를 판단합니다. 아래 두 조건을 <strong>모두</strong> 충족하면 RA입니다:
          </p>
        </Prose>
        <div
          className="my-6 p-5"
          style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 2 }}
        >
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>
            SPT 공식
          </p>
          <ol className="space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
            <li>1. 해당 과세연도에 미국에 <strong>31일 이상</strong> 체류</li>
            <li className="mt-2">2. 가중치 합산 <strong>183일 이상</strong>:</li>
          </ol>
          <div
            className="mt-3 p-4 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed"
            style={{ background: "var(--cream)", borderRadius: 2, color: "var(--ink)" }}
          >
            해당 연도 체류일 &times; <strong>1</strong>
            <br />
            + 전년도 체류일 &times; <strong>1/3</strong>
            <br />
            + 전전년도 체류일 &times; <strong>1/6</strong>
            <br />
            = <span style={{ color: "var(--accent)" }}>183일 이상이면 RA</span>
          </div>
        </div>

        {/* SPT exemption section — varies by visa */}
        {isH1B ? (
          <>
            <SectionLabel>H-1B와 SPT</SectionLabel>
            <Callout type="warn" label="H-1B는 SPT 면제가 없습니다">
              H-1B 비자 소지자는 SPT에서 면제되는 기간이 없습니다.
              <br /><br />
              따라서 <strong>첫 해부터 183일 이상 체류하면 RA</strong>입니다. 대부분의 H-1B 소지자는 연중 체류하므로 <strong>RA로 분류</strong>됩니다.
            </Callout>
            <Prose>
              <p>
                H-1B 첫 해에 중간부터 체류하여 183일 미만인 경우, 해당 연도는 NRA로 분류됩니다. 이 경우 두 가지 선택이 있습니다:
              </p>
            </Prose>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-px my-6 overflow-hidden"
              style={{ background: "var(--rule)", borderRadius: 2 }}
            >
              <div className="p-5" style={{ background: "var(--paper)" }}>
                <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
                  Option A — Dual Status
                </p>
                <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                  해당 연도를 NRA 기간 + RA 기간으로 나눠 각각 신고
                </p>
                <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-faint)" }}>
                  복잡하지만 정확한 방법
                </p>
              </div>
              <div className="p-5" style={{ background: "var(--paper)" }}>
                <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--moss)" }}>
                  Option B — First-Year Choice
                </p>
                <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                  도착일부터 RA로 취급해달라고 선택 (배우자 공동 신고 가능)
                </p>
                <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-faint)" }}>
                  Standard Deduction 활용 가능
                </p>
              </div>
            </div>
          </>
        ) : isDependent ? (
          <>
            <SectionLabel>동반비자와 거주자 상태</SectionLabel>
            <Callout type="info" label="주비자 소지자의 상태를 따릅니다">
              동반비자(J-2, F-2, H-4) 소지자의 NRA/RA 상태는 <strong>주비자 소지자의 상태를 따릅니다</strong>.
              <br /><br />
              &bull; 주비자 소지자가 NRA &rarr; 동반비자도 NRA
              <br />
              &bull; 주비자 소지자가 RA &rarr; 동반비자도 RA
            </Callout>
          </>
        ) : (
          <>
            <SectionLabel>{visa.label} SPT 면제 기간</SectionLabel>
            <Prose>
              <p>
                {visa.label} 소지자는 SPT에서 일정 기간 면제됩니다:
              </p>
            </Prose>
            <div
              className="my-6 p-5"
              style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 2 }}
            >
              <p
                className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3"
                style={{ color: "var(--accent)" }}
              >
                {visa.label}
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                SPT 면제: <strong>{exemptYears} Calendar Years</strong> (햇수 {exemptYears}년)
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-faint)" }}>
                {isStudent
                  ? "학생 신분은 더 긴 면제 기간 적용"
                  : "Research Scholar, Professor, Short-term Scholar 포함"}
              </p>
            </div>

            <Callout type="warn" label="Calendar Year 주의">
              <T tip="Calendar Year = 달력상의 한 해 (1월 1일~12월 31일). IRS는 해당 연도에 하루라도 미국에 있었으면 1년으로 카운트합니다.">
                Calendar Year
              </T>
              란? IRS는 해당 연도에 <strong>단 하루</strong>라도 미국에 있었으면 1년으로 카운트합니다.
              <br /><br />
              예시: 2024년 12월 31일 도착 &rarr; 2024년이 첫 번째 calendar year
            </Callout>
          </>
        )}

        {isValidYear && !isH1B && !isDependent && exemptYears > 0 && (
          <Callout type="info" label={`나의 상태 (${visa.label} 기준)`}>
            <strong>{arrivalNum}년</strong> 도착 기준:
            <br />
            &bull; {arrivalNum}~{arrivalNum + exemptYears - 1}년:{" "}
            <T tip="Non-Resident Alien — 미국 세법상 비거주 외국인.">
              <strong style={{ color: "var(--accent)" }}>NRA</strong>
            </T>
            {" "}&rarr;{" "}
            <T tip="Form 1040-NR — NRA(비거주 외국인)가 미국 소득을 신고할 때 사용하는 IRS 양식.">
              Form 1040-NR
            </T>
            {" "}+{" "}
            <T tip="Form 8843 — 미국에 체류한 모든 NRA가 의무적으로 제출해야 하는 정보 보고 양식.">
              Form 8843
            </T>
            {arrivalNum + exemptYears <= 2026 && (
              <>
                <br />
                &bull; {arrivalNum + exemptYears}년~:{" "}
                <T tip="Resident Alien — 미국 세법상 거주 외국인. SPT 면제 기간이 끝난 후 RA로 전환됩니다.">
                  <strong>RA로 전환 가능</strong>
                </T>
                {" "}&rarr;{" "}
                <T tip="Form 1040 — 미국 시민 및 거주 외국인(RA)이 사용하는 표준 소득세 신고 양식.">
                  Form 1040
                </T>
              </>
            )}
          </Callout>
        )}

        {isValidYear && isH1B && (
          <Callout type="info" label="나의 상태 (H-1B 기준)">
            <strong>{arrivalNum}년</strong> 도착 기준:
            <br />
            &bull; {arrivalNum}년에 183일 이상 체류했다면:{" "}
            <strong style={{ color: "var(--accent)" }}>RA</strong> &rarr; Form 1040
            <br />
            &bull; {arrivalNum}년에 183일 미만 체류했다면:{" "}
            <strong style={{ color: "var(--accent)" }}>NRA</strong> &rarr; Form 1040-NR (또는 First-Year Choice)
            {arrivalNum < 2025 && (
              <>
                <br />
                &bull; {arrivalNum + 1}년 이후: 연중 체류 시 <strong>RA</strong>
              </>
            )}
          </Callout>
        )}

        <Callout type="tip" label="중요">
          {isH1B ? (
            <>
              <T tip="Resident Alien — 미국 세법상 거주 외국인.">RA</T>가 되면{" "}
              <T tip="TurboTax — 미국에서 가장 많이 사용되는 세금 신고 소프트웨어."><strong>TurboTax</strong></T>나{" "}
              <T tip="H&R Block — 미국의 대표적인 세금 신고 서비스/소프트웨어."><strong>H&R Block</strong></T>을 사용할 수 있습니다.
              H-1B 첫 해에 NRA인 경우에만{" "}
              <T tip="Sprintax — NRA(비거주 외국인) 전용 온라인 세금 신고 도구."><strong>Sprintax</strong></T>를 사용하세요.
            </>
          ) : (
            <>
              <T tip="Non-Resident Alien — 미국 세법상 비거주 외국인.">NRA</T>
              는{" "}
              <T tip="TurboTax — 미국에서 가장 많이 사용되는 세금 신고 소프트웨어. NRA는 사용할 수 없습니다."><strong>TurboTax</strong></T>
              나{" "}
              <T tip="H&R Block — 미국의 대표적인 세금 신고 서비스/소프트웨어. NRA는 사용 불가합니다."><strong>H&R Block</strong></T>
              을 사용할 수 없습니다. NRA는 반드시{" "}
              <T tip="Sprintax — NRA 전용 온라인 세금 신고 도구."><strong>Sprintax</strong></T>
              {" "}또는{" "}
              <T tip="GLACIER Tax Prep — 대학에서 NRA에게 제공하는 연방세 전용 작성 도구."><strong>GLACIER Tax Prep</strong></T>
              을 사용하세요.
            </>
          )}
        </Callout>
      </>
    );
  }

  /* ==============================================================
     STEP 2 — 한미 조세조약
     ============================================================== */

  function Step2() {
    if (!visa) return <VisaPrompt />;

    const isH1B = visaType === "h1b";
    const isDependent = visaType === "dependent";
    const isJ1Researcher = visaType === "j1-researcher";
    const isStudent = visaType === "f1-student" || visaType === "j1-student";

    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}
        >
          한미 조세조약 혜택
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          {isDependent
            ? "동반비자의 조세조약 적용"
            : <>
                <T tip={`Korea-US Tax Treaty ${visa.treatyArticle} — 한국에서 온 비자 소지자에게 적용되는 면세 조항입니다.`}>
                  {visa.treatyArticle}
                </T>{" "}— 소득세 면제의 핵심
              </>
          }
        </p>

        {isDependent ? (
          <>
            <Prose>
              <p>
                동반비자(J-2, F-2, H-4) 소지자 본인에게는 별도의 조세조약 혜택이 직접 적용되지 않습니다.
                조세조약의 면세 조항은 주비자 소지자(J-1, F-1 등)에게 적용됩니다.
              </p>
            </Prose>
            <Callout type="info" label="동반비자 소득세">
              J-2 또는 H-4 EAD로 취업하여 소득이 있는 경우, 해당 소득에 대해 <strong>일반적인 세금 신고 의무</strong>가 있습니다.
              <br /><br />
              NRA인 경우 Form 1040-NR + Form 8843, RA인 경우 Form 1040을 제출합니다.
            </Callout>
            <Callout type="warn" label="Form 8843">
              소득이 없더라도 NRA인 동반비자는 <strong>Form 8843을 반드시 개별적으로 제출</strong>해야 합니다.
              배우자와 자녀 각각 1장씩 별도로 제출합니다.
            </Callout>
          </>
        ) : isH1B ? (
          <>
            <Prose>
              <p>
                H-1B 소지자의 조세조약 혜택은 제한적입니다. 대학이나 연구기관에서 교수 또는 연구직으로 근무하는 경우에만{" "}
                <T tip="Korea-US Tax Treaty Article 20(1) — 교수/연구 소득에 대한 면세 조항.">Article 20(1)</T>을 적용받을 수 있습니다.
              </p>
            </Prose>

            <div
              className="my-8 py-8 px-6 text-center"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                borderRadius: 2,
              }}
            >
              <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "var(--ink-faint)" }}>
                조세조약 혜택
              </p>
              <p className="font-[family-name:var(--font-serif)] text-[clamp(18px,3vw,28px)] font-black leading-tight">
                대학 교수/연구직인 경우만
              </p>
              <p className="font-[family-name:var(--font-serif)] text-[clamp(18px,3vw,28px)] font-black leading-tight" style={{ color: "var(--accent-soft)" }}>
                Article 20(1) 적용 가능
              </p>
              <p className="text-[13px] mt-3" style={{ color: "var(--ink-faint)" }}>
                일반 회사 근무 시 조세조약 혜택 없음
              </p>
            </div>

            <Callout type="info" label="H-1B RA — Standard Deduction">
              H-1B로 RA인 경우, 미국 시민과 동일하게 <strong>Standard Deduction($14,600, 2024 기준 Single)</strong>을 적용받습니다.
              <br /><br />
              또한 RA는 <strong>전 세계 소득(Worldwide Income)</strong>에 대해 과세됩니다. 한국의 소득이 있다면 함께 신고해야 합니다.
              단, <T tip="Foreign Tax Credit — 외국에서 납부한 세금을 미국 세금에서 공제받는 제도. 이중과세를 방지합니다.">Foreign Tax Credit</T>으로 이중과세를 방지할 수 있습니다.
            </Callout>

            <SectionLabel>FICA (Social Security + Medicare)</SectionLabel>
            <Callout type="warn" label="H-1B는 FICA 면제 대상이 아닙니다">
              H-1B 소지자는 NRA든 RA든 <strong>FICA 세금(Social Security 6.2% + Medicare 1.45%)을 납부</strong>해야 합니다.
              <br /><br />
              이는 F-1, J-1과의 중요한 차이점입니다. W-2에서 FICA가 원천징수됩니다.
            </Callout>
          </>
        ) : (
          <>
            <Prose>
              <p>
                한국과 미국 사이의 조세조약에 따라 {visa.label} 소지자는 소득세 면제 혜택을 받을 수 있습니다.
                이는 상당한 금액의 세금을 절약할 수 있는 중요한 혜택입니다.
              </p>
            </Prose>

            {/* Hero stat */}
            <div
              className="my-8 py-8 px-6 text-center"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                borderRadius: 2,
              }}
            >
              <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "var(--ink-faint)" }}>
                {visa.treatyArticle}
              </p>
              {isJ1Researcher ? (
                <>
                  <p className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-tight">
                    최대 2 Calendar Years
                  </p>
                  <p className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-tight" style={{ color: "var(--accent-soft)" }}>
                    교수·연구 소득 전액 면세
                  </p>
                </>
              ) : (
                <>
                  <p className="font-[family-name:var(--font-serif)] text-[clamp(20px,3.5vw,30px)] font-black leading-tight">
                    장학금·학비 면세
                  </p>
                  <p className="font-[family-name:var(--font-serif)] text-[clamp(20px,3.5vw,30px)] font-black leading-tight" style={{ color: "var(--accent-soft)" }}>
                    + 생활비 목적 소득 연 $2,000
                  </p>
                </>
              )}
              <p className="text-[13px] mt-3" style={{ color: "var(--ink-faint)" }}>
                연방 소득세 + 주 소득세
              </p>
            </div>

            <SectionLabel>면세 혜택 상세</SectionLabel>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <span
                  className="w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-bold shrink-0 mt-0.5"
                  style={{ background: "var(--moss-bg)", color: "var(--moss)" }}
                >
                  O
                </span>
                <div>
                  <p className="font-medium text-sm" style={{ color: "var(--ink)" }}>면제 대상</p>
                  <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                    {isJ1Researcher
                      ? <>교수·연구 활동으로 인한 소득 (<T tip="Federal Income Tax — 연방 정부에 납부하는 소득세.">연방 소득세</T>, <T tip="State Income Tax — 주 정부에 납부하는 소득세.">주 소득세</T>)</>
                      : <>장학금·fellowship 소득 면세, 생활비 목적 소득 연 $2,000까지 (<T tip="Federal Income Tax — 연방 정부에 납부하는 소득세.">연방 소득세</T>, <T tip="State Income Tax — 주 정부에 납부하는 소득세.">주 소득세</T>)</>
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span
                  className="w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-bold shrink-0 mt-0.5"
                  style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
                >
                  X
                </span>
                <div>
                  <p className="font-medium text-sm" style={{ color: "var(--ink)" }}>면제가 아닌 것</p>
                  <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                    <T tip="미국 사회보장 연금을 위한 세금. 급여의 약 6.2%입니다.">Social Security Tax</T>,{" "}
                    <T tip="미국 의료보험(메디케어)을 위한 세금. 급여의 약 1.45%입니다.">Medicare Tax</T>{" "}
                    (단, NRA {visa.label}는 FICA 자체가 면제)
                  </p>
                </div>
              </div>
            </div>

            {isJ1Researcher && (
              <Callout type="warn" label="&ldquo;햇수&rdquo; 2년이란?">
                Calendar year 기준입니다. 총 24개월이 아닙니다.
                <br /><br />
                예: 2024년 9월 도착 &rarr; <strong>2024년</strong>(첫 해, 4개월만 해당) + <strong>2025년</strong>(두 번째 해) = 면세 종료.
                2026년부터는 면세 혜택이 없습니다.
              </Callout>
            )}

            {isValidYear && isJ1Researcher && (
              <Callout type="info" label="나의 면세 기간">
                &bull; <strong>{arrivalNum}년</strong> — 면세 적용 (첫 번째 해)
                <br />
                &bull; <strong>{arrivalNum + 1}년</strong> — 면세 적용 (두 번째 해)
                <br />
                &bull; <strong>{arrivalNum + 2}년~</strong> — 면세 혜택 종료
              </Callout>
            )}

            {isValidYear && isStudent && (
              <Callout type="info" label="나의 면세 기간">
                Article 21(1)의 장학금·학비 면세는 NRA인 동안 계속 적용됩니다 (최대 5년).
                <br /><br />
                생활비 목적 소득 $2,000/년 면세도 NRA 기간 동안 적용됩니다.
              </Callout>
            )}

            {visaType === "f1-student" && (
              <Callout type="info" label="OPT/CPT 참고">
                <T tip="Optional Practical Training — F-1 학생이 전공 관련 분야에서 취업할 수 있는 제도.">OPT</T> 또는{" "}
                <T tip="Curricular Practical Training — F-1 학생이 학업 과정 중 인턴 등으로 일할 수 있는 제도.">CPT</T>로 일하는 동안에도,
                5년 이내라면 여전히 <strong>NRA</strong>이며{" "}
                <strong>FICA가 면제</strong>됩니다.
                <br /><br />
                OPT/CPT 소득은 W-2로 보고되며, 1040-NR로 신고합니다.
              </Callout>
            )}
          </>
        )}

        {/* Form 8233 — for applicable visas */}
        {visa.form8233 && (
          <>
            <SectionLabel>
              <T tip="외국인의 조세조약 면제를 고용주에게 신청하는 IRS 양식.">
                Form 8233
              </T>{" "}
              — 사전 면세 신청
            </SectionLabel>
            <Prose>
              <p>
                고용주에게 <Code>Form 8233</Code>을 제출하면, 매 급여에서 소득세가{" "}
                <T tip="원천징수(Withholding) — 고용주가 급여에서 세금을 미리 떼어 IRS에 납부하는 것.">
                  원천징수
                </T>
                되지 않은 상태로 급여를 받을 수 있습니다. 매년 새로 제출해야 합니다.
              </p>
            </Prose>

            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-px mt-6 overflow-hidden"
              style={{ background: "var(--rule)", borderRadius: 2 }}
            >
              <div className="p-4" style={{ background: "var(--paper)" }}>
                <p className="text-[13px] font-bold mb-1" style={{ color: "var(--moss)" }}>제출한 경우</p>
                <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>소득세 원천징수 없이 급여 수령</p>
              </div>
              <div className="p-4" style={{ background: "var(--paper)" }}>
                <p className="text-[13px] font-bold mb-1" style={{ color: "var(--accent)" }}>제출 안 한 경우</p>
                <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>원천징수 후 나중에 환급 신청</p>
              </div>
            </div>
          </>
        )}

        <Callout type="tip" label="참조">
          조세조약의 공식 내용은{" "}
          <T tip="IRS Publication 901 — U.S. Tax Treaties. 미국이 체결한 모든 조세조약을 요약한 공식 IRS 문서입니다.">
            IRS Publication 901 (U.S. Tax Treaties)
          </T>
          에서 확인할 수 있습니다.{" "}
          {isJ1Researcher
            ? "한국 관련 조항은 Article 20을 참조하세요."
            : isStudent
              ? "한국 관련 조항은 Article 21을 참조하세요."
              : isH1B
                ? "한국 관련 교수/연구 조항은 Article 20을 참조하세요."
                : ""}
          {visa.form8233 && (
            <>
              <br /><br />
              아직 Form 8233을 제출하지 않았다면 학교/기관의 HR 또는 Payroll 부서에 문의하세요.
              올해분이라도 제출하면 남은 기간의 원천징수를 줄일 수 있습니다.
            </>
          )}
        </Callout>
      </>
    );
  }

  /* ==============================================================
     STEP 3 — 서류 준비
     ============================================================== */

  function Step3() {
    if (!visa) return <VisaPrompt />;

    const docs = visa.docs;
    const checkedCount = [...checkedDocs].filter((id) => docs.some((d) => d.id === id)).length;
    const totalCount = docs.length;
    const allChecked = checkedCount === totalCount;

    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}
        >
          필요 서류 체크리스트
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          {visa.label} 세금 신고에 필요한 서류를 하나씩 준비하세요
        </p>

        {/* Progress */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-1 rounded-full" style={{ background: "var(--rule-light)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%`,
                background: allChecked ? "var(--moss)" : "var(--accent)",
              }}
            />
          </div>
          <span
            className="font-[family-name:var(--font-mono)] text-[12px] font-bold tabular-nums shrink-0"
            style={{ color: allChecked ? "var(--moss)" : "var(--ink-muted)" }}
          >
            {checkedCount}/{totalCount}
          </span>
        </div>

        {/* Checklist */}
        <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
          {docs.map((doc) => {
            const checked = checkedDocs.has(doc.id);
            return (
              <label
                key={doc.id}
                className="flex items-start gap-4 py-3.5 cursor-pointer transition-colors"
                style={{ borderBottom: "1px solid var(--rule-light)" }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDoc(doc.id)}
                  className="mt-0.5"
                />
                <div>
                  <p
                    className="text-[14.5px] font-medium transition-all"
                    style={{
                      color: checked ? "var(--ink-faint)" : "var(--ink)",
                      textDecoration: checked ? "line-through" : "none",
                    }}
                  >
                    {doc.label}
                  </p>
                  <p className="text-[12.5px] mt-0.5" style={{ color: "var(--ink-faint)" }}>
                    {doc.desc}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        <Callout type="info" label="W-2는 언제?">
          고용주는 매년 <strong>1월 말~2월 초</strong>에{" "}
          <T tip="Wage and Tax Statement. 고용주가 연간 급여 소득과 원천징수된 세금 내역을 정리한 서류입니다.">
            W-2
          </T>
          를 발급합니다.
          대학 소속이라면 Workday 등 시스템에서 전자 W-2를 다운로드할 수도 있습니다.
          2월 중순까지 받지 못했다면 HR에 문의하세요.
        </Callout>

        <Callout type="warn" label="SSN이 없는 경우">
          <T tip="Individual Taxpayer Identification Number — SSN을 받을 수 없는 외국인에게 IRS가 발급하는 납세자 번호입니다.">ITIN</T>
          으로 대체할 수 있습니다. <Code>Form W-7</Code>을 세금 신고서(1040-NR)와 함께 제출하면 ITIN을 신청할 수 있습니다.
          <br /><br />
          단, <strong>Form 8843은 SSN이나 ITIN이 없어도 제출 가능합니다.</strong> SSN/ITIN 란에 &ldquo;NRA — No SSN/ITIN&rdquo;이라고 기재하면 됩니다.
        </Callout>

        <Callout type="tip" label="I-94 출력">
          <ol className="list-decimal ml-4 space-y-1 mt-1">
            <li>
              <T tip="I-94: 미국 입출국 기록. 세관국경보호청(CBP) 웹사이트에서 온라인으로 조회/출력할 수 있습니다.">
                CBP 웹사이트
              </T>
              (i94.cbp.dhs.gov) 접속
            </li>
            <li>&ldquo;Get Most Recent I-94&rdquo; 클릭</li>
            <li>여권 정보 입력 후 조회</li>
            <li>I-94 기록 출력 (PDF 저장 추천)</li>
            <li><strong>Travel History</strong>도 함께 출력 (연도별 입출국 날짜 확인용)</li>
          </ol>
        </Callout>

        {visaType === "dependent" && (
          <Callout type="info" label="동반비자 서류 참고">
            주비자 소지자의 비자 서류(DS-2019, I-20 등) 사본이 필요합니다.
            <br /><br />
            EAD(Employment Authorization Document)로 취업한 경우, EAD 사본과 W-2도 준비하세요.
          </Callout>
        )}
      </>
    );
  }

  /* ==============================================================
     STEP 4 — 연방세 신고
     ============================================================== */

  function Step4() {
    if (!visa) return <VisaPrompt />;

    const isH1B = visaType === "h1b";
    const isDependent = visaType === "dependent";
    const isF1 = visaType === "f1-student";

    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}
        >
          연방세 신고
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          <T tip="Internal Revenue Service — 미국 국세청.">IRS</T>에 제출하는 Federal Tax
        </p>

        <SectionLabel>신고 케이스 확인</SectionLabel>

        {isH1B ? (
          <div
            className="grid grid-cols-1 gap-px my-4 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}
          >
            <div className="p-5" style={{ background: "var(--accent-bg)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
                대부분의 H-1B — RA
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 1040</Code> 제출. TurboTax, H&R Block 등 사용 가능.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                마감: 2026년 4월 15일
              </p>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>
                H-1B 첫 해 NRA (183일 미만 체류)
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 1040-NR</Code> 제출, 또는 First-Year Choice로 <Code>Form 1040</Code>.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                NRA 부분: Sprintax 사용
              </p>
            </div>
          </div>
        ) : isDependent ? (
          <div
            className="grid grid-cols-1 gap-px my-4 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}
          >
            <div className="p-5" style={{ background: "var(--accent-bg)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
                NRA + 소득 없음
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 8843</Code>만 제출. SSN/ITIN 없어도 제출 가능합니다.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                마감: 2026년 6월 15일
              </p>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>
                NRA + EAD 취업 소득 있음
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 1040-NR</Code> + <Code>Form 8843</Code> 함께 제출.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                마감: wages 원천징수 있으면 4/15, 없으면 6/15
              </p>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>
                RA (주비자 소지자 RA 전환 시)
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 1040</Code> 제출. TurboTax, H&R Block 등 사용 가능.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                마감: 2026년 4월 15일
              </p>
            </div>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 gap-px my-4 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}
          >
            <div className="p-5" style={{ background: "var(--accent-bg)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
                Case 1 — NRA + 소득 없음
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 8843</Code>만 제출. SSN/ITIN 없어도 제출 가능합니다.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                마감: 2026년 6월 15일
              </p>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
                Case 2 — NRA + 미국 소득 있음
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 1040-NR</Code> + <Code>Form 8843</Code> 함께 제출.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                마감: wages 원천징수 있으면 4/15, 없으면 6/15
              </p>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>
                Case 3 — RA (거주자)
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 1040</Code> 제출. TurboTax, H&R Block 등 사용 가능.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                마감: 2026년 4월 15일
              </p>
            </div>
          </div>
        )}

        {/* Form 8843 section */}
        {!isH1B && (
          <>
            <SectionLabel>01 — Form 8843 (모든 NRA 필수)</SectionLabel>
            <Prose>
              <p>
                미국에 체류한 모든{" "}
                <T tip="Non-Resident Alien. 미국 세법상 비거주 외국인입니다.">NRA</T>
                가 반드시 제출해야 하는 양식입니다.
              </p>
            </Prose>
            <ul className="mt-3 space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
              {[
                "소득 유무와 관계없이 모든 NRA 필수 제출",
                isDependent
                  ? "동반비자 본인도 개별적으로 1장 제출 (주비자 소지자와 별도)"
                  : "배우자(동반비자)와 부양가족도 각각 1장씩 별도 제출",
                "인적 사항, 비자 정보, 체류 기간 등을 기록",
                "소득이 전혀 없다면 이 양식만 제출하면 됨",
                "SSN이나 ITIN이 없어도 제출 가능 (해당 란에 \"NRA — No SSN\" 기재)",
              ].map((item, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                  {item}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Form 1040-NR section */}
        {!isH1B && (
          <>
            <SectionLabel>02 — Form 1040-NR (NRA + 소득 있는 경우)</SectionLabel>
            <Prose>
              <p>
                미국 내 소득이 있는 NRA가 제출하는{" "}
                <T tip="U.S. Nonresident Alien Income Tax Return.">소득세 신고 양식</T>입니다.
              </p>
            </Prose>
            <ul className="mt-3 space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                <T tip="W-2: 고용주가 발급하는 연간 급여 소득 및 원천징수 내역 서류입니다.">W-2</T>에 기재된 급여 소득과 원천징수 세금 정보 사용
              </li>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                한미 조세조약 면세 혜택도 이 양식에서 청구
              </li>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                <T tip="1042-S: 조세조약에 의해 면제된 소득 내역을 보여주는 서류입니다.">1042-S</T>가 있다면 함께 참조하여 작성
              </li>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                SSN이 없는 경우 <Code>Form W-7</Code>으로{" "}
                <T tip="Individual Taxpayer Identification Number.">ITIN</T>을 함께 신청 (1040-NR에 동봉)
              </li>
            </ul>

            {!isH1B && (
              <Callout type="warn" label="주의">
                <strong>TurboTax, H&R Block은 NRA가 사용할 수 없습니다.</strong> 이 소프트웨어들은 Resident 전용입니다.
              </Callout>
            )}
          </>
        )}

        {/* H-1B RA specific */}
        {isH1B && (
          <>
            <SectionLabel>01 — Form 1040 (H-1B RA)</SectionLabel>
            <Prose>
              <p>
                대부분의 H-1B 소지자는 RA로서 <Code>Form 1040</Code>을 사용합니다.
                미국 시민과 동일한 절차로 신고합니다.
              </p>
            </Prose>
            <ul className="mt-3 space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
              {[
                "Standard Deduction: $14,600 (2024 기준, Single)",
                "전 세계 소득(Worldwide Income)에 대해 과세",
                "한국 소득이 있다면 함께 신고 (Foreign Tax Credit으로 이중과세 방지)",
                "FICA(Social Security + Medicare) 원천징수 — 환급 대상 아님",
                "W-2, 1099 등 소득 서류 기반으로 작성",
              ].map((item, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                  {item}
                </li>
              ))}
            </ul>

            <Callout type="info" label="Worldwide Income">
              RA는 미국 소득뿐 아니라 <strong>전 세계 소득</strong>에 대해 신고 의무가 있습니다.
              <br /><br />
              &bull; 한국 은행 이자, 부동산 임대 소득, 투자 수익 등 포함
              <br />
              &bull; 한국에서 이미 세금을 납부했다면 <T tip="Form 1116 — Foreign Tax Credit. 외국에서 납부한 세금을 미국 세금에서 공제.">Form 1116 (Foreign Tax Credit)</T>으로 이중과세 방지
              <br />
              &bull; 해외 금융계좌 합산 $10,000 초과 시 <T tip="Report of Foreign Bank and Financial Accounts. 해외 금융계좌 보유 시 미 재무부에 보고하는 양식.">FBAR</T> 신고 필요
            </Callout>

            <Callout type="warn" label="FICA는 환급 대상이 아닙니다">
              H-1B 소지자의 FICA(Social Security 6.2% + Medicare 1.45%)는 정상적인 원천징수입니다.
              F-1, J-1처럼 FICA 면제 대상이 아니므로 <strong>FICA 환급을 신청하면 안 됩니다</strong>.
            </Callout>
          </>
        )}

        {/* Tools section */}
        <SectionLabel>{isH1B ? "02" : "03"} — 작성 도구</SectionLabel>

        {isH1B ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-px my-4 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}
          >
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-bold text-[14px] mb-3" style={{ color: "var(--ink)" }}>
                <T tip="미국에서 가장 많이 사용되는 세금 신고 소프트웨어.">TurboTax</T>
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>&bull; RA 전용 (H-1B 대부분 해당)</li>
                <li>&bull; 무료~유료 버전 다양</li>
                <li>&bull; 연방세 + 주세 모두 지원</li>
                <li>&bull; e-file 지원</li>
                <li>&bull; 한국어 미지원</li>
              </ul>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-bold text-[14px] mb-3" style={{ color: "var(--ink)" }}>
                <T tip="미국의 대표적인 세금 신고 서비스.">H&R Block</T>
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>&bull; RA 전용</li>
                <li>&bull; 온라인 + 오프라인 지점</li>
                <li>&bull; 연방세 + 주세 모두 지원</li>
                <li>&bull; e-file 지원</li>
                <li>&bull; 세무사 상담 가능</li>
              </ul>
            </div>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-px my-4 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}
          >
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-bold text-[14px] mb-3" style={{ color: "var(--ink)" }}>
                <T tip="NRA 전용 온라인 세금 신고 작성 도구.">Sprintax</T>
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>&bull; 연방세 + 주세 모두 지원</li>
                <li>&bull; 학교에서 무료 코드 제공 가능</li>
                <li>&bull; 주세 별도 비용 ~$25-35</li>
                <li>&bull; 작성 후 출력, 우편 발송</li>
                <li>&bull; 연방세 e-file 가능 (추가 비용)</li>
              </ul>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-bold text-[14px] mb-3" style={{ color: "var(--ink)" }}>
                <T tip="대학에서 제공하는 NRA 전용 연방세 작성 도구.">GLACIER Tax Prep</T>
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>&bull; 학교 제공 시 무료</li>
                <li>&bull; 연방세 전용 (주세 미지원)</li>
                <li>&bull; access code 이메일 발송</li>
                <li>&bull; 작성 후 출력, 우편 발송</li>
              </ul>
            </div>
          </div>
        )}

        <Callout type="tip" label="팁">
          {isH1B
            ? "TurboTax Free Edition은 간단한 세금 신고(W-2 소득만)에 무료로 사용할 수 있습니다. 복잡한 상황(투자소득, 해외소득 등)은 유료 버전이 필요합니다."
            : <>대부분의 대학에서 Sprintax 또는 GLACIER Tax Prep의 무료 코드를 제공합니다.
              학교의 <T tip="International Office — 유학생/방문연구원을 지원하는 학교 부서.">International Office</T> 또는 HR에 먼저 문의하세요.</>
          }
        </Callout>

        {/* OPT/CPT note for F-1 */}
        {isF1 && (
          <Callout type="info" label="OPT/CPT 세금 신고">
            OPT 또는 CPT로 일하는 F-1 학생은:
            <br /><br />
            &bull; 5년 이내라면 여전히 <strong>NRA</strong> &rarr; Form 1040-NR 사용
            <br />
            &bull; <strong>FICA 면제</strong> (고용주가 잘못 징수한 경우 환급 신청 가능)
            <br />
            &bull; W-2에 FICA가 원천징수되어 있다면 고용주에게 먼저 정정 요청
            <br />
            &bull; 정정이 안 되면 <Code>Form 843</Code> + <Code>Form 8316</Code>으로 IRS에 직접 환급 신청
          </Callout>
        )}

        {/* Dependent EAD note */}
        {isDependent && (
          <Callout type="info" label="EAD 취업 시 FICA">
            J-2 EAD로 취업한 경우: 주비자 소지자가 NRA라면 동반비자도 NRA이지만, <strong>J-2 EAD 취업 소득에는 FICA가 적용</strong>됩니다.
            <br /><br />
            H-4 EAD로 취업한 경우: H-1B 주비자 소지자가 RA이므로 동반비자도 보통 RA이며, <strong>FICA 납부 대상</strong>입니다.
          </Callout>
        )}

        <SectionLabel>{isH1B ? "03" : "04"} — 작성 시 필요한 정보</SectionLabel>
        <ul className="space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
          {[
            "여권 정보 (이름, 번호, 만료일)",
            ...(visaType === "f1-student" ? ["I-20 정보 (SEVIS ID, 학교명)"] : []),
            ...(visaType === "j1-researcher" || visaType === "j1-student" ? ["DS-2019 정보 (프로그램 번호, 스폰서 기관)"] : []),
            ...(visaType === "dependent" ? ["주비자 소지자의 비자 서류 정보"] : []),
            "I-94 기록 (입국일, 출국일)",
            "미국 입국/출국 날짜 — 연도별 정리 필요",
            isH1B ? "SSN (Social Security Number)" : "SSN (Social Security Number) 또는 ITIN",
            "W-2 (급여 소득, 원천징수 금액)",
            ...(!isH1B ? ["1042-S (조세조약 적용 소득, 해당 시)"] : []),
            "1099-INT / 1099-DIV / 1099-NEC (해당 시)",
          ].map((item, i) => (
            <li key={i} className="flex items-baseline gap-3">
              <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
              {item}
            </li>
          ))}
        </ul>

        <Callout type="info" label="E-file">
          {isH1B
            ? "TurboTax, H&R Block 모두 e-file을 지원합니다. 우편보다 빠르고 안전하며, 환급도 2~3주 내에 받을 수 있습니다."
            : <>Sprintax를 통해 연방세를{" "}
              <T tip="Electronic Filing — 세금 서류를 온라인으로 전자 제출하는 것.">e-file</T>
              할 수도 있습니다. 가능하다면 우편보다 빠르고 안전합니다. 단, 추가 비용이 발생할 수 있습니다.</>
          }
        </Callout>
      </>
    );
  }

  /* ==============================================================
     STEP 5 — 주세 신고
     ============================================================== */

  function Step5() {
    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}
        >
          주세 신고
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          거주 주의{" "}
          <T tip="State Income Tax — 각 주 정부에 납부하는 소득세. 연방세와 별도로 신고해야 합니다. 세율은 주마다 다릅니다.">
            State Tax
          </T>{" "}
          신고
        </p>

        <Prose>
          <p>
            미국에서는 연방세 외에 주 단위의 소득세도 따로 신고해야 합니다. 단, 소득세가 없는 주에 거주한다면 주세 신고가 필요하지 않습니다.
          </p>
        </Prose>

        <SectionLabel>소득세가 없는 주</SectionLabel>
        <div className="flex flex-wrap gap-2 mb-2">
          {NO_TAX_STATES.map((state) => (
            <span
              key={state}
              className="font-[family-name:var(--font-mono)] text-[12px] px-2.5 py-1"
              style={{
                background: "var(--moss-bg)",
                color: "var(--moss)",
                borderRadius: 2,
              }}
            >
              {state}
            </span>
          ))}
        </div>
        <p className="text-[13px] mt-2" style={{ color: "var(--ink-faint)" }}>
          위 주에 거주하면서 다른 주에서 일하지 않았다면 주세 신고 불필요
        </p>

        <SectionLabel>주세 신고 필요 여부 빠른 체크</SectionLabel>
        <Callout type="tip" label="W-2 확인법">
          W-2의 <strong>Box 15 (State)</strong>, <strong>Box 16 (State wages)</strong>, <strong>Box 17 (State income tax)</strong>를 확인하세요.
          <br /><br />
          &bull; Box 17에 금액이 있다면 &rarr; 주 소득세가 원천징수된 것이므로, <strong>주세 신고를 해야 환급</strong>받을 수 있습니다.
          <br />
          &bull; Box 17이 0이고 소득세 없는 주라면 &rarr; 주세 신고 불필요.
        </Callout>

        <SectionLabel>소득세가 있는 주</SectionLabel>
        <ul className="space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
          {[
            "각 주마다 양식과 절차가 다름",
            visaType === "h1b"
              ? "RA: TurboTax, H&R Block 등에서 주세도 함께 작성 가능"
              : "NRA: Sprintax 사용 추천 (자동으로 해당 주 양식 작성, ~$25-35)",
            "직접 작성 시: 거주 주의 Department of Revenue 웹사이트에서 양식 다운로드",
            "여러 주에서 일한 경우 각 주에 별도로 신고해야 함",
          ].map((item, i) => (
            <li key={i} className="flex items-baseline gap-3">
              <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
              {item}
            </li>
          ))}
        </ul>

        <Callout type="info" label="조세조약 + 주세">
          대부분의 주에서 한미 조세조약의 면세 혜택이 주세에도 적용됩니다.
          {visaType === "h1b"
            ? " H-1B RA의 경우 주세에서는 일반적인 Standard Deduction이 적용됩니다."
            : " Sprintax를 사용하면 이를 자동으로 처리해 줍니다."}
        </Callout>

        <SectionLabel>{visaType === "h1b" ? "주세 신고 방법" : "Sprintax로 주세 신고하기"}</SectionLabel>
        <div className="space-y-3">
          {(visaType === "h1b"
            ? [
                "TurboTax 또는 H&R Block에서 연방세와 함께 작성",
                "주세 양식이 자동으로 생성됨",
                "e-file로 연방세와 함께 제출 가능",
                "일부 주는 별도 제출 필요 — 소프트웨어 안내 참조",
              ]
            : [
                "Sprintax에서 연방세 작성을 먼저 완료",
                "주세(State Tax) 추가 신청 (별도 비용 ~$25-35)",
                "연방세 서류는 바로, 주세 서류는 약 3일 후 이메일 발송",
                "받은 서류를 출력하여 해당 주 세무서로 우편 발송",
              ]
          ).map((item, i) => (
            <div key={i} className="flex gap-4 items-baseline">
              <span
                className="font-[family-name:var(--font-mono)] text-[12px] font-bold shrink-0"
                style={{ color: "var(--accent)" }}
              >
                {i + 1}
              </span>
              <span className="text-[14px]" style={{ color: "var(--ink-light)" }}>{item}</span>
            </div>
          ))}
        </div>

        <Callout type="warn" label="지방세(Local Tax)">
          일부 도시(예: Pittsburgh, NYC 등)에서는 별도의{" "}
          <T tip="Local Tax — 시/군 단위의 지방세. 모든 도시에 있는 것은 아니며, 있는 경우 별도 신고가 필요합니다.">
            지방세
          </T>
          를 부과합니다. 거주 도시의 세금 규정을 확인하세요.
        </Callout>
      </>
    );
  }

  /* ==============================================================
     STEP 6 — 서류 제출
     ============================================================== */

  function Step6() {
    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}
        >
          서류 제출 방법
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          작성한 세금 서류, 어디로 어떻게 보내나
        </p>

        {visaType === "h1b" && (
          <Callout type="tip" label="e-file 추천">
            H-1B RA라면 TurboTax 또는 H&R Block에서 <strong>e-file</strong>로 바로 제출할 수 있습니다.
            우편 발송이 필요 없어 가장 빠르고 안전합니다.
          </Callout>
        )}

        <SectionLabel>IRS 우편 주소 (연방세)</SectionLabel>
        <div
          className="grid grid-cols-1 gap-px my-4 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}
        >
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--moss)" }}>
              납부할 세금이 없는 경우 (환급 또는 $0)
            </p>
            <p className="font-[family-name:var(--font-mono)] text-[14px] leading-relaxed" style={{ color: "var(--ink)" }}>
              Department of the Treasury
              <br />
              Internal Revenue Service
              <br />
              Austin, TX 73301-0215
            </p>
          </div>
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
              납부할 세금이 있는 경우 (체크 동봉)
            </p>
            <p className="font-[family-name:var(--font-mono)] text-[14px] leading-relaxed" style={{ color: "var(--ink)" }}>
              Internal Revenue Service
              <br />
              P.O. Box 1303
              <br />
              Charlotte, NC 28201-1303
            </p>
          </div>
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>
              Form 8843만 제출하는 경우
            </p>
            <p className="font-[family-name:var(--font-mono)] text-[14px] leading-relaxed" style={{ color: "var(--ink)" }}>
              Department of the Treasury
              <br />
              Internal Revenue Service
              <br />
              Austin, TX 73301-0215
            </p>
          </div>
        </div>

        <Callout type="warn" label="USPS만 사용!">
          위 주소는 모두 <strong>P.O. Box</strong>입니다.
          <strong> UPS, FedEx, DHL 등 사설 택배로는 배달이 불가능합니다.</strong>
          반드시 <strong>USPS (미국 우체국)</strong>를 이용하세요.
        </Callout>

        <SectionLabel>제출할 곳 요약</SectionLabel>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-px my-4 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}
        >
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
              연방세 &rarr; IRS
            </p>
            <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
              {visaType === "h1b" ? (
                <>
                  <li><Code>1040</Code> (또는 <Code>1040-NR</Code>)</li>
                  <li>W-2 원본 첨부</li>
                  <li>위 IRS 주소로 발송 (또는 e-file)</li>
                </>
              ) : (
                <>
                  <li><Code>1040-NR</Code> + <Code>8843</Code></li>
                  <li>W-2 원본 첨부</li>
                  <li>1042-S 원본 첨부 (해당 시)</li>
                  <li>위 IRS 주소로 발송</li>
                </>
              )}
            </ul>
          </div>
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>
              주세 &rarr; State
            </p>
            <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
              <li>주 세금 양식 (주마다 다름)</li>
              <li>W-2 사본 첨부</li>
              <li>주소: {visaType === "h1b" ? "소프트웨어" : "Sprintax"} 가이드에 기재됨</li>
              <li>연방세와 <strong>별도 봉투</strong>로 발송</li>
            </ul>
          </div>
        </div>

        <Callout type="info" label="별도 봉투">
          연방세는 IRS로, 주세는 주 세무서로, <strong>별도의 봉투</strong>에 넣어 각각 다른 주소로 보내야 합니다.
        </Callout>

        <SectionLabel>우편 발송 방법</SectionLabel>
        <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
          {[
            {
              tag: "추천",
              tagColor: "var(--moss)",
              name: "USPS Priority Mail",
              price: "~$8-10",
              desc: "2~3일 도착, 추적 가능, USPS 전용 — IRS P.O. Box에 확실히 배달",
            },
            {
              tag: "보통",
              tagColor: "var(--ink-muted)",
              name: "USPS Certified Mail + First Class",
              price: "~$5-7",
              desc: "추적 가능, 5~7일 도착. 접수 증명 필요시 사용",
            },
            {
              tag: "비추",
              tagColor: "var(--accent)",
              name: "USPS First Class Mail",
              price: "~$1-2",
              desc: "추적 불가, 분실 위험. 세금 서류에는 비추천",
            },
          ].map((m) => (
            <div
              key={m.name}
              className="flex items-start gap-4 py-3.5"
              style={{ borderBottom: "1px solid var(--rule-light)" }}
            >
              <span
                className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm shrink-0 mt-0.5 text-white"
                style={{ background: m.tagColor }}
              >
                {m.tag}
              </span>
              <div>
                <p className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                  {m.name}{" "}
                  <span className="font-[family-name:var(--font-mono)] text-[12px]" style={{ color: "var(--ink-faint)" }}>
                    {m.price}
                  </span>
                </p>
                <p className="text-[12.5px] mt-0.5" style={{ color: "var(--ink-muted)" }}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <SectionLabel>제출 전 최종 체크</SectionLabel>
        <div className="space-y-2">
          {[
            "모든 양식에 서명했는지 확인",
            "W-2, 1042-S 등 필요 서류 동봉 확인",
            "연방세와 주세를 별도 봉투에 준비",
            "봉투에 반송 주소(Return Address) 기재",
            "모든 서류의 사본 보관 (스캔 추천)",
            "우편 영수증(추적번호) 보관",
            "USPS로만 발송 (UPS/FedEx 불가!)",
          ].map((item, i) => (
            <div key={i} className="flex gap-3 items-baseline text-[14px]">
              <span className="font-[family-name:var(--font-mono)] text-[11px] font-bold" style={{ color: "var(--ink-faint)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ color: "var(--ink-light)" }}>{item}</span>
            </div>
          ))}
        </div>

        <Callout type="tip" label="E-file">
          {visaType === "h1b"
            ? "TurboTax 또는 H&R Block에서 e-file하면 우편 발송 없이 바로 제출됩니다. 24시간 내 접수 확인, 2~3주 내 환급 가능합니다."
            : <>Sprintax에서 연방세{" "}
              <T tip="e-file: 세금 서류를 온라인으로 전자 제출.">e-file</T>
              이 가능한 경우, 우편보다 훨씬 빠르고 안전합니다. e-file 하면 위의 우편 주소 걱정도 없습니다.</>
          }
        </Callout>
      </>
    );
  }

  /* ==============================================================
     STEP 7 — 환급 추적
     ============================================================== */

  function Step7() {
    const isH1B = visaType === "h1b";

    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}
        >
          리펀드 추적
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          세금 환급 상태를 확인하는 방법
        </p>

        <Callout type="info" label="다시 한번">
          <strong>세금 신고(Tax Return) &ne; 환급(Refund)</strong>
          <br />
          세금 신고는 의무이며, 결과에 따라 환급이 있을 수도, 추가 납부가 있을 수도 있습니다.
          원천징수(W-2 Box 2)된 금액이 실제 세금보다 많았다면 차액을 환급받습니다.
        </Callout>

        <SectionLabel>연방세 환급 추적</SectionLabel>
        <Prose>
          <p>
            IRS 웹사이트에서 <strong>&ldquo;Where&apos;s My Refund&rdquo;</strong>를 검색하여 접속합니다.
          </p>
        </Prose>

        <div
          className="mt-4 p-5"
          style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 2 }}
        >
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>
            필요 정보
          </p>
          <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-light)" }}>
            <li>&bull;{" "}
              <T tip="Social Security Number — 미국 사회보장번호. 9자리 숫자입니다.">SSN</T>{" "}
              (또는{" "}
              <T tip="Individual Taxpayer Identification Number — SSN이 없는 외국인을 위한 납세자 번호.">ITIN</T>)
            </li>
            <li>&bull;{" "}
              <T tip="Filing Status — 세금 신고 시의 납세자 상태 (Single, Married 등).">
                Filing Status
              </T>
              {" "}({isH1B ? "세금 소프트웨어" : "Sprintax"} 서류에서 확인)
            </li>
            <li>&bull;{" "}
              <T tip="Refund Amount — 환급 예상 금액.">
                Refund Amount
              </T>
              {" "}({isH1B ? "세금 소프트웨어" : "Sprintax"} 서류에서 확인)
            </li>
          </ul>
        </div>

        <div
          className="grid grid-cols-2 gap-px my-6 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}
        >
          <div className="py-5 px-4 text-center" style={{ background: "var(--paper)" }}>
            <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--ink-muted)" }}>
              우편 제출
            </p>
            <p className="font-[family-name:var(--font-serif)] text-[28px] font-black" style={{ color: "var(--ink)" }}>
              6~12주
            </p>
            <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>약 4주 후부터 조회 가능</p>
          </div>
          <div className="py-5 px-4 text-center" style={{ background: "var(--paper)" }}>
            <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--ink-muted)" }}>
              E-file
            </p>
            <p className="font-[family-name:var(--font-serif)] text-[28px] font-black" style={{ color: "var(--moss)" }}>
              2~3주
            </p>
            <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>약 24시간 후 조회 가능</p>
          </div>
        </div>

        <SectionLabel>환급 상태 메시지</SectionLabel>
        <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
          {[
            { status: "Return Received", desc: "서류가 접수되었습니다", dot: "var(--ink-faint)" },
            { status: "Being Processed", desc: "서류를 검토/처리 중입니다", dot: "var(--ochre)" },
            { status: "Refund Approved", desc: "환급이 승인되었습니다", dot: "var(--moss)" },
            { status: "Refund Sent", desc: "환급금 발송됨 (1~5일 내 입금)", dot: "var(--moss)" },
          ].map((item) => (
            <div
              key={item.status}
              className="flex items-center gap-3 py-3"
              style={{ borderBottom: "1px solid var(--rule-light)" }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.dot }} />
              <div>
                <p className="font-[family-name:var(--font-mono)] text-[12.5px] font-medium" style={{ color: "var(--ink)" }}>
                  {item.status}
                </p>
                <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <SectionLabel>주세 환급 추적</SectionLabel>
        <Prose>
          <p>
            구글에 <strong>&ldquo;Where&apos;s my [주 이름] refund&rdquo;</strong>를 검색하면 해당 주의 환급 조회 페이지를 찾을 수 있습니다.
          </p>
        </Prose>
        <ul className="mt-3 space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
          <li className="flex items-baseline gap-3">
            <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
            필요 정보: SSN, Tax Year, Refund Amount
          </li>
          <li className="flex items-baseline gap-3">
            <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
            서류 도착 후 약 4~6주 소요
          </li>
        </ul>

        <SectionLabel>자주 하는 실수 5가지</SectionLabel>
        <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
          {[
            ...(isH1B
              ? [
                  {
                    mistake: "H-1B RA인데 NRA 소프트웨어(Sprintax)로 신고",
                    fix: "RA는 TurboTax, H&R Block 등 일반 소프트웨어 사용",
                  },
                  {
                    mistake: "Worldwide Income 미신고",
                    fix: "RA는 전 세계 소득을 신고해야 합니다 (한국 소득 포함)",
                  },
                  {
                    mistake: "FICA 환급 잘못 신청",
                    fix: "H-1B는 FICA 면제 대상이 아닙니다 — 잘못 신청하면 문제 발생",
                  },
                ]
              : [
                  {
                    mistake: "NRA인데 TurboTax로 신고",
                    fix: "NRA는 반드시 Sprintax 또는 GLACIER Tax Prep 사용",
                  },
                  {
                    mistake: "Form 8843 제출 누락",
                    fix: "소득이 없어도 NRA라면 반드시 제출 (배우자/자녀도 각각)",
                  },
                  {
                    mistake: "조세조약 혜택 미청구",
                    fix: `1040-NR에서 Treaty ${visa ? visa.treatyArticle : ""} 혜택 반드시 기입`,
                  },
                ]
            ),
            {
              mistake: "연방세와 주세를 같은 봉투로 발송",
              fix: "반드시 별도 봉투, 별도 주소로 각각 발송",
            },
            {
              mistake: "UPS/FedEx로 IRS에 발송",
              fix: "IRS 주소는 P.O. Box — USPS만 배달 가능",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="py-3.5"
              style={{ borderBottom: "1px solid var(--rule-light)" }}
            >
              <p className="text-[14px] font-medium" style={{ color: "var(--accent)" }}>
                <span className="font-[family-name:var(--font-mono)] text-[11px] mr-2">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.mistake}
              </p>
              <p className="text-[13px] mt-1 ml-[28px]" style={{ color: "var(--ink-muted)" }}>
                &rarr; {item.fix}
              </p>
            </div>
          ))}
        </div>

        <SectionLabel>문제가 생겼다면?</SectionLabel>
        <div className="space-y-3 text-[14px]" style={{ color: "var(--ink-light)" }}>
          <p>
            <strong>6주 이상 조회가 안 되는 경우:</strong> 서류를 다시 보내는 것을 고려하세요.
            다시 보낼 때 서류에 <Code>Duplicate</Code>라고 표시하고, 재발송 사유를 짧게 메모하세요.
          </p>
          <p>
            <strong>IRS 전화 문의:</strong>{" "}
            <span className="font-[family-name:var(--font-mono)]">1-800-829-1040</span>{" "}
            (전화 시 &ldquo;nonresident for tax purposes&rdquo;라고 안내)
          </p>
          <p>
            <strong>재발송 시:</strong> USPS Priority Mail 강력 추천.
          </p>
        </div>

        <Callout type="warn" label="스캠 주의">
          IRS는 <strong>절대로</strong> 전화, 이메일, 문자로 기프트카드 구매나 송금을 요구하지 않습니다.
          의심되는 연락을 받으면 무시하고, 개인정보(SSN, 은행정보)를 모르는 사람에게 절대 제공하지 마세요.
        </Callout>

        {/* Completion */}
        <div
          className="mt-10 py-10 px-6 text-center"
          style={{ background: "var(--ink)", borderRadius: 2 }}
        >
          <p
            className="font-[family-name:var(--font-serif)] text-[clamp(20px,3.5vw,28px)] font-black"
            style={{ color: "var(--paper)" }}
          >
            수고하셨습니다.
          </p>
          <p className="text-[14px] mt-3 leading-relaxed" style={{ color: "var(--ink-faint)" }}>
            이 가이드를 따라 단계별로 진행하면
            <br />
            세금 신고를 무사히 마칠 수 있습니다.
          </p>
          <div
            className="w-12 h-[2px] mx-auto mt-5"
            style={{ background: "var(--accent)" }}
          />
        </div>

        {/* Contact & Credit */}
        <SectionLabel>기타 문의</SectionLabel>
        <Prose>
          <p>
            가이드 관련 문의나 오류 제보는 아래 이메일로 보내주세요.
          </p>
        </Prose>
        <div
          className="mt-4 p-5"
          style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 2 }}
        >
          <p className="font-[family-name:var(--font-mono)] text-[14px]" style={{ color: "var(--ink)" }}>
            <a href="mailto:gmlcks00513@gmail.com" style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 3 }}>
              gmlcks00513@gmail.com
            </a>
          </p>
        </div>

        <div
          className="mt-8 pt-6 pb-2 text-center"
          style={{ borderTop: "1px solid var(--rule-light)" }}
        >
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-wide" style={{ color: "var(--ink-faint)" }}>
            Developed by{" "}
            <a
              href="https://www.instagram.com/dev_seochan/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--ink-muted)", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              서찬
            </a>
          </p>
        </div>
      </>
    );
  }

  /* ==============================================================
     SHARED — VisaPrompt (shown when no visa selected)
     ============================================================== */

  function VisaPrompt() {
    return (
      <div className="py-16 text-center">
        <p
          className="font-[family-name:var(--font-serif)] text-[clamp(20px,3.5vw,28px)] font-black mb-4"
          style={{ color: "var(--ink)" }}
        >
          먼저 비자를 선택해 주세요
        </p>
        <p className="text-[15px] mb-6" style={{ color: "var(--ink-muted)" }}>
          Step 01에서 본인의 비자 유형을 선택하면
          <br />
          맞춤형 가이드가 표시됩니다.
        </p>
        <button
          onClick={() => goTo(0)}
          className="font-[family-name:var(--font-mono)] text-[13px] font-bold px-5 py-2.5 transition-colors"
          style={{
            background: "var(--ink)",
            color: "var(--paper)",
            borderRadius: 4,
            cursor: "pointer",
            border: "none",
          }}
        >
          Step 01로 이동
        </button>
      </div>
    );
  }
}
