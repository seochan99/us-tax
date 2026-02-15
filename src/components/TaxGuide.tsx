"use client";

import { useState, useEffect, type ReactNode } from "react";

/* ================================================================
   LOCAL STORAGE HELPERS
   ================================================================ */

const LS_KEYS = {
  step: "taxguide:step",
  checkedDocs: "taxguide:checkedDocs",
  arrivalYear: "taxguide:arrivalYear",
  visited: "taxguide:visited",
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

interface DocItem {
  id: string;
  label: string;
  desc: string;
}

const DOCUMENTS: DocItem[] = [
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
];

const NO_TAX_STATES = [
  "Alaska", "Florida", "Nevada", "New Hampshire",
  "South Dakota", "Tennessee", "Texas", "Washington", "Wyoming",
];

/* ================================================================
   UI PRIMITIVES
   ================================================================ */

function T({ children, tip }: { children: ReactNode; tip: string }) {
  return (
    <span className="term-tooltip">
      {children}
      <span className="tt-content">{tip}</span>
    </span>
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

  /* Persist to localStorage on change */
  useEffect(() => { saveToLS(LS_KEYS.step, step); }, [step]);
  useEffect(() => { saveToLS(LS_KEYS.checkedDocs, [...checkedDocs]); }, [checkedDocs]);
  useEffect(() => { saveToLS(LS_KEYS.arrivalYear, arrivalYear); }, [arrivalYear]);
  useEffect(() => { saveToLS(LS_KEYS.visited, [...visited]); }, [visited]);

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

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ---- Top bar ---- */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{
          background: "rgba(245, 240, 232, 0.85)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div className="max-w-[680px] mx-auto px-5 sm:px-8 h-12 flex items-center justify-between">
          <span
            className="font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.12em] uppercase"
            style={{ color: "var(--ink-muted)" }}
          >
            J-1 세금 가이드
          </span>
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
        <main className="pt-8 pb-32 animate-step" key={step}>
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
            background: "rgba(245, 240, 232, 0.9)",
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
          한국인 J-1 Researcher / 포닥을 위한 단계별 안내서
        </p>

        <Prose>
          <p>
            미국에서{" "}
            <T tip="교환 방문 연구자 비자. 대학/연구기관에서 연구를 위해 발급받는 비자입니다.">
              J-1 Researcher
            </T>
            로 일하면서 세금 신고가 처음이신가요? 이 가이드가 처음부터 끝까지 안내해 드립니다.
          </p>
        </Prose>

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
            { label: "비용", value: "$0–35", sub: "도구 사용료" },
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

        <SectionLabel>3가지 신고 케이스</SectionLabel>
        <Prose>
          <p className="mb-4">본인 상황에 따라 제출하는 양식이 다릅니다:</p>
        </Prose>
        <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
          <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--accent)" }}>Case 1</span>
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>NRA + 소득 없음</span>
            </div>
            <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
              <Code>Form 8843</Code>만 제출 (SSN/ITIN 없어도 가능)
            </p>
          </div>
          <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--accent)" }}>Case 2</span>
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>NRA + 미국 소득 있음</span>
            </div>
            <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
              <Code>Form 1040-NR</Code> + <Code>Form 8843</Code> 함께 제출
            </p>
          </div>
          <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--accent)" }}>Case 3</span>
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>RA (거주자 전환)</span>
            </div>
            <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
              <Code>Form 1040</Code> 제출 (TurboTax 등 사용 가능)
            </p>
          </div>
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
          <p className="mb-3">조세조약 면세 기간 계산에 사용됩니다.</p>
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
            {Array.from({ length: 12 }, (_, i) => 2015 + i).map((y) => (
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
    );
  }

  /* ==============================================================
     STEP 1 — 거주자 상태 확인
     ============================================================== */

  function Step1() {
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
                <Code>Form 1040-NR</Code> 사용
              </li>
              <li>
                <Code>Form 8843</Code> 필수 제출
              </li>
              <li>
                <T tip="Federal Insurance Contributions Act. 사회보장세(Social Security)와 메디케어세(Medicare)를 합친 명칭입니다.">FICA</T>{" "}
                면제
              </li>
              <li>Sprintax / GLACIER Tax Prep</li>
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
                <Code>Form 1040</Code> 사용
              </li>
              <li>TurboTax, H&R Block 사용 가능</li>
              <li>FICA 납부 대상</li>
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

        <SectionLabel>J 비자 SPT 면제 기간</SectionLabel>
        <Prose>
          <p>
            J 비자 소지자는 SPT에서 일정 기간 면제됩니다. <strong>비자 카테고리에 따라 면제 기간이 다릅니다:</strong>
          </p>
        </Prose>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-px my-6 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}
        >
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p
              className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3"
              style={{ color: "var(--accent)" }}
            >
              J-1 Scholar / Teacher / Trainee
            </p>
            <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
              SPT 면제: <strong>2 Calendar Years</strong> (햇수 2년)
            </p>
            <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-faint)" }}>
              Research Scholar, Professor, Short-term Scholar 포함
            </p>
          </div>
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p
              className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3"
              style={{ color: "var(--ink-muted)" }}
            >
              J-1 Student / F-1 Student
            </p>
            <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
              SPT 면제: <strong>5 Calendar Years</strong> (햇수 5년)
            </p>
            <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-faint)" }}>
              학생 신분은 더 긴 면제 기간 적용
            </p>
          </div>
        </div>

        <Callout type="warn" label="Calendar Year 주의">
          <T tip="Calendar Year = 달력상의 한 해 (1월 1일~12월 31일). IRS는 해당 연도에 하루라도 미국에 있었으면 1년으로 카운트합니다.">
            Calendar Year
          </T>
          란? IRS는 해당 연도에 <strong>단 하루</strong>라도 미국에 있었으면 1년으로 카운트합니다.
          <br /><br />
          예시: 2024년 12월 31일 도착 &rarr; 2024년이 첫 번째 calendar year
        </Callout>

        {isValidYear && (
          <Callout type="info" label="나의 상태 (J-1 Researcher 기준)">
            <strong>{arrivalNum}년</strong> 도착 기준:
            <br />
            &bull; {arrivalNum}~{arrivalNum + 1}년: <strong style={{ color: "var(--accent)" }}>NRA</strong> &rarr; Form 1040-NR + Form 8843
            {arrivalNum + 2 <= 2026 && (
              <>
                <br />
                &bull; {arrivalNum + 2}년~: <strong>RA로 전환 가능</strong> &rarr; Form 1040
              </>
            )}
          </Callout>
        )}

        <Callout type="tip" label="중요">
          NRA는 <strong>TurboTax나 H&R Block을 사용할 수 없습니다.</strong> 이 소프트웨어들은 RA 전용입니다.
          NRA는 반드시 <strong>Sprintax</strong> 또는 <strong>GLACIER Tax Prep</strong>을 사용하세요.
        </Callout>
      </>
    );
  }

  /* ==============================================================
     STEP 2 — 한미 조세조약
     ============================================================== */

  function Step2() {
    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}
        >
          한미 조세조약 혜택
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          <T tip="Korea-US Tax Treaty Article 21 — 한국에서 온 연구자/학생에게 미국 소득세를 일정 기간 면제해주는 조항입니다.">
            Article 21
          </T>{" "}
          — 소득세 면제의 핵심
        </p>

        <Prose>
          <p>
            한국과 미국 사이의 조세조약에 따라 J-1 Researcher는 소득세 면제 혜택을 받을 수 있습니다.
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
            면세 혜택
          </p>
          <p className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-tight">
            최대 2 Calendar Years
          </p>
          <p className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-tight" style={{ color: "var(--accent-soft)" }}>
            소득세 면제
          </p>
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
                <T tip="Federal Income Tax — 연방 정부에 납부하는 소득세. IRS에서 관할합니다.">연방 소득세</T>,{" "}
                <T tip="State Income Tax — 주 정부에 납부하는 소득세. 주마다 세율이 다릅니다.">주 소득세</T>
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
                (단, NRA J-1은 FICA 자체가 면제)
              </p>
            </div>
          </div>
        </div>

        <Callout type="warn" label="&ldquo;햇수&rdquo; 2년이란?">
          Calendar year 기준입니다. 총 24개월이 아닙니다.
          <br /><br />
          예: 2024년 9월 도착 &rarr; <strong>2024년</strong>(첫 해, 4개월만 해당) + <strong>2025년</strong>(두 번째 해) = 면세 종료.
          2026년부터는 면세 혜택이 없습니다.
        </Callout>

        {isValidYear && (
          <Callout type="info" label="나의 면세 기간">
            &bull; <strong>{arrivalNum}년</strong> — 면세 적용 (첫 번째 해)
            <br />
            &bull; <strong>{arrivalNum + 1}년</strong> — 면세 적용 (두 번째 해)
            <br />
            &bull; <strong>{arrivalNum + 2}년~</strong> — 면세 혜택 종료
          </Callout>
        )}

        <SectionLabel>
          <T tip="외국인의 조세조약 면제를 고용주에게 신청하는 IRS 양식. 제출하면 급여에서 소득세가 원천징수되지 않습니다.">
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

        <Callout type="tip" label="참조">
          조세조약의 공식 내용은{" "}
          <T tip="IRS Publication 901 — U.S. Tax Treaties. 미국이 체결한 모든 조세조약을 요약한 공식 IRS 문서입니다.">
            IRS Publication 901 (U.S. Tax Treaties)
          </T>
          에서 확인할 수 있습니다. 한국 관련 조항은 Article 21을 참조하세요.
          <br /><br />
          아직 Form 8233을 제출하지 않았다면 학교/기관의 HR 또는 Payroll 부서에 문의하세요.
          올해분이라도 제출하면 남은 기간의 원천징수를 줄일 수 있습니다.
        </Callout>
      </>
    );
  }

  /* ==============================================================
     STEP 3 — 서류 준비
     ============================================================== */

  function Step3() {
    const checkedCount = checkedDocs.size;
    const totalCount = DOCUMENTS.length;
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
          세금 신고에 필요한 서류를 하나씩 준비하세요
        </p>

        {/* Progress */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-1 rounded-full" style={{ background: "var(--rule-light)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(checkedCount / totalCount) * 100}%`,
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
          {DOCUMENTS.map((doc) => {
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
          <T tip="Wage and Tax Statement. 고용주가 연간 급여 소득과 원천징수된 세금 내역을 정리한 서류입니다. 세금 신고 시 필수입니다.">
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
      </>
    );
  }

  /* ==============================================================
     STEP 4 — 연방세 신고
     ============================================================== */

  function Step4() {
    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}
        >
          연방세 신고
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          <T tip="Internal Revenue Service — 미국 국세청. 연방 세금을 관할하는 정부 기관입니다.">IRS</T>에 제출하는 Federal Tax
        </p>

        <SectionLabel>신고 케이스 확인</SectionLabel>
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
            "배우자(J-2)와 부양가족도 각각 1장씩 별도 제출",
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

        <SectionLabel>02 — Form 1040-NR (NRA + 소득 있는 경우)</SectionLabel>
        <Prose>
          <p>
            미국 내 소득이 있는 NRA가 제출하는{" "}
            <T tip="U.S. Nonresident Alien Income Tax Return. NRA가 소득세를 신고할 때 사용하는 IRS 양식입니다.">
              소득세 신고 양식
            </T>
            입니다.
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
            <T tip="1042-S: 조세조약에 의해 면제된 소득 또는 외국인에게 지급된 소득 내역을 보여주는 서류입니다.">1042-S</T>가 있다면 함께 참조하여 작성
          </li>
          <li className="flex items-baseline gap-3">
            <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
            SSN이 없는 경우 <Code>Form W-7</Code>으로{" "}
            <T tip="Individual Taxpayer Identification Number — SSN을 받을 수 없는 외국인에게 IRS가 발급하는 납세자 번호입니다.">ITIN</T>
            을 함께 신청 (1040-NR에 동봉)
          </li>
        </ul>

        <Callout type="warn" label="주의">
          <strong>TurboTax, H&R Block은 NRA가 사용할 수 없습니다.</strong> 이 소프트웨어들은 Resident 전용입니다.
        </Callout>

        <SectionLabel>03 — 작성 도구</SectionLabel>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-px my-4 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}
        >
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p className="font-bold text-[14px] mb-3" style={{ color: "var(--ink)" }}>
              <T tip="NRA 전용 온라인 세금 신고 작성 도구. 연방세와 주세 모두 지원합니다.">Sprintax</T>
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
              <T tip="대학에서 제공하는 NRA 전용 연방세 작성 도구. 무료 access code가 필요합니다.">GLACIER Tax Prep</T>
            </p>
            <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
              <li>&bull; 학교 제공 시 무료</li>
              <li>&bull; 연방세 전용 (주세 미지원)</li>
              <li>&bull; access code 이메일 발송</li>
              <li>&bull; 작성 후 출력, 우편 발송</li>
            </ul>
          </div>
        </div>

        <Callout type="tip" label="팁">
          대부분의 대학에서 Sprintax 또는 GLACIER Tax Prep의 무료 코드를 제공합니다.
          학교의 <T tip="International Office — 유학생/방문연구원을 지원하는 학교 부서. OIE, ISSS, OIA 등 명칭이 다양합니다.">International Office</T> 또는 HR에 먼저 문의하세요.
        </Callout>

        <SectionLabel>04 — 작성 시 필요한 정보</SectionLabel>
        <ul className="space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
          {[
            "여권 정보 (이름, 번호, 만료일)",
            "DS-2019 정보 (프로그램 번호, 스폰서 기관)",
            "I-94 기록 (입국일, 출국일)",
            "미국 입국/출국 날짜 — 연도별 정리 필요",
            "SSN (Social Security Number) 또는 ITIN",
            "W-2 (급여 소득, 원천징수 금액)",
            "1042-S (조세조약 적용 소득, 해당 시)",
            "1099-INT / 1099-DIV / 1099-NEC (해당 시)",
          ].map((item, i) => (
            <li key={i} className="flex items-baseline gap-3">
              <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
              {item}
            </li>
          ))}
        </ul>

        <Callout type="info" label="E-file">
          Sprintax를 통해 연방세를{" "}
          <T tip="Electronic Filing — 세금 서류를 온라인으로 전자 제출하는 것. 우편보다 훨씬 빠르고 안전합니다.">e-file</T>
          할 수도 있습니다. 가능하다면 우편보다 빠르고 안전합니다.
          단, 추가 비용이 발생할 수 있습니다.
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
            "Sprintax 사용 추천 (자동으로 해당 주 양식 작성, ~$25-35)",
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
          Sprintax를 사용하면 이를 자동으로 처리해 줍니다.
        </Callout>

        <SectionLabel>Sprintax로 주세 신고하기</SectionLabel>
        <div className="space-y-3">
          {[
            "Sprintax에서 연방세 작성을 먼저 완료",
            "주세(State Tax) 추가 신청 (별도 비용 ~$25-35)",
            "연방세 서류는 바로, 주세 서류는 약 3일 후 이메일 발송",
            "받은 서류를 출력하여 해당 주 세무서로 우편 발송",
          ].map((item, i) => (
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
              <li><Code>1040-NR</Code> + <Code>8843</Code></li>
              <li>W-2 원본 첨부</li>
              <li>1042-S 원본 첨부 (해당 시)</li>
              <li>위 IRS 주소로 발송</li>
            </ul>
          </div>
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>
              주세 &rarr; State
            </p>
            <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
              <li>주 세금 양식 (주마다 다름)</li>
              <li>W-2 사본 첨부</li>
              <li>주소: Sprintax 가이드에 기재됨</li>
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
          Sprintax에서 연방세{" "}
          <T tip="e-file: 세금 서류를 온라인으로 전자 제출. 24시간 내 접수 확인, 2~3주 내 환급 가능.">
            e-file
          </T>
          이 가능한 경우, 우편보다 훨씬 빠르고 안전합니다.
          e-file 하면 위의 우편 주소 걱정도 없습니다.
        </Callout>
      </>
    );
  }

  /* ==============================================================
     STEP 7 — 환급 추적
     ============================================================== */

  function Step7() {
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
              <T tip="Filing Status — 세금 신고 시의 납세자 상태 (Single, Married 등). Sprintax 서류에서 확인 가능합니다.">
                Filing Status
              </T>
              {" "}(Sprintax 서류에서 확인)
            </li>
            <li>&bull;{" "}
              <T tip="Refund Amount — 환급 예상 금액. Sprintax에서 작성 완료 후 확인할 수 있습니다.">
                Refund Amount
              </T>
              {" "}(Sprintax 서류에서 확인)
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
              fix: "1040-NR에서 Treaty Article 21 혜택 반드시 기입",
            },
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
}
