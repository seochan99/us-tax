"use client";
/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */

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
  visaType: "taxguide:visaType"
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
  } catch {/* quota exceeded — ignore */}
}

/* ================================================================
   DATA
   ================================================================ */

const STEPS = [
"Get Started",
"Residency Status",
"Tax Treaty",
"Prepare Documents",
"Federal Tax",
"State Tax",
"Submit",
"Track Refund"];


type VisaType = "f1-student" | "j1-researcher" | "j1-student" | "h1b" | "l1" | "l2" | "dependent" | "green-card" | "citizen";

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
  alwaysResident?: boolean;
  filingStatuses?: string[];
  standardDeductions?: Record<string, string>;
  worldwideIncome?: boolean;
  efilePrimary?: boolean;
}

const COMMON_DOCS: DocItem[] = [
{ id: "passport", label: "Passport", desc: "Original valid passport" },
{ id: "i94", label: "I-94 Arrival/Departure Record", desc: "Printed from i94.cbp.dhs.gov" },
{ id: "entrydates", label: "U.S. entry/exit dates (by year)", desc: "Check arrival and departure dates by year through passport stamp or I-94 Travel History." },
{ id: "ssn", label: "SSN (or ITIN)", desc: "Social Security Number. If not, it can be replaced with ITIN (Form W-7)" },
{ id: "w2", label: "W-2", desc: "Issued by employer (January-February), salary and withholding tax details" },
{ id: "1042s", label: "1042-S (if applicable)", desc: "If you have income subject to a tax treaty" },
{ id: "1099int", label: "1099-INT (if applicable)", desc: "If you have bank interest income" },
{ id: "1099div", label: "1099-DIV (if applicable)", desc: "If you have dividend income" },
{ id: "1099nec", label: "1099-NEC (if applicable)", desc: "If you have income as an independent contractor (freelancer)" },
{ id: "prev", label: "Copy of previous year's tax return", desc: "If you have previously reported" }];


const VISA_CONFIGS: Record<VisaType, VisaConfig> = {
  "f1-student": {
    label: "F-1 Student",
    labelKo: "international student",
    desc: "International student studying in the United States on an F-1 visa",
    sptExemptYears: 5,
    treatyArticle: "Article 21(1)",
    treatyBenefit: "Tax exemption for tuition and scholarships, income up to $2,000 per year for living expenses, tax exemption",
    ficaExempt: true,
    nraToolsOnly: true,
    docs: [
    { id: "passport", label: "Passport", desc: "Original valid passport" },
    { id: "i20", label: "I-20", desc: "Admission documents issued by the school" },
    { id: "i94", label: "I-94 Arrival/Departure Record", desc: "Printed from i94.cbp.dhs.gov" },
    { id: "entrydates", label: "U.S. entry/exit dates (by year)", desc: "Check arrival and departure dates by year through passport stamp or I-94 Travel History." },
    { id: "ssn", label: "SSN (or ITIN)", desc: "Social Security Number. If not, it can be replaced with ITIN (Form W-7)" },
    { id: "w2", label: "W-2", desc: "Issued by employer (January-February), salary and withholding tax details" },
    { id: "1042s", label: "1042-S (if applicable)", desc: "If you have income subject to a tax treaty" },
    { id: "1099int", label: "1099-INT (if applicable)", desc: "If you have bank interest income" },
    { id: "1099div", label: "1099-DIV (if applicable)", desc: "If you have dividend income" },
    { id: "1099nec", label: "1099-NEC (if applicable)", desc: "If you have income as an independent contractor (freelancer)" },
    { id: "prev", label: "Copy of previous year's tax return", desc: "If you have previously reported" }],

    form8233: true
  },
  "j1-researcher": {
    label: "J-1 Researcher/Scholar",
    labelKo: "Researcher/Professor",
    desc: "Visiting researcher/professor conducting research or teaching in the United States on a J-1 visa",
    sptExemptYears: 2,
    treatyArticle: "Article 20(1)",
    treatyBenefit: "All income from teaching and research is tax exempt (up to 2 years)",
    ficaExempt: true,
    nraToolsOnly: true,
    docs: [
    { id: "passport", label: "Passport", desc: "Original valid passport" },
    { id: "ds2019", label: "DS-2019", desc: "Documents issued by J-1 sponsoring organization" },
    { id: "i94", label: "I-94 Arrival/Departure Record", desc: "Printed from i94.cbp.dhs.gov" },
    { id: "entrydates", label: "U.S. entry/exit dates (by year)", desc: "Check arrival and departure dates by year through passport stamp or I-94 Travel History." },
    { id: "ssn", label: "SSN (or ITIN)", desc: "Social Security Number. If not, it can be replaced with ITIN (Form W-7)" },
    { id: "w2", label: "W-2", desc: "Issued by employer (January-February), salary and withholding tax details" },
    { id: "1042s", label: "1042-S (if applicable)", desc: "If you have income subject to a tax treaty" },
    { id: "1099int", label: "1099-INT (if applicable)", desc: "If you have bank interest income" },
    { id: "1099div", label: "1099-DIV (if applicable)", desc: "If you have dividend income" },
    { id: "1099nec", label: "1099-NEC (if applicable)", desc: "If you have income as an independent contractor (freelancer)" },
    { id: "prev", label: "Copy of previous year's tax return", desc: "If you have previously reported" }],

    form8233: true
  },
  "j1-student": {
    label: "J-1 Student",
    labelKo: "exchange student",
    desc: "Students participating in an exchange program in the United States on a J-1 visa",
    sptExemptYears: 5,
    treatyArticle: "Article 21(1)",
    treatyBenefit: "Tax exemption for tuition and scholarships, income up to $2,000 per year for living expenses, tax exemption",
    ficaExempt: true,
    nraToolsOnly: true,
    docs: [
    { id: "passport", label: "Passport", desc: "Original valid passport" },
    { id: "ds2019", label: "DS-2019", desc: "Documents issued by J-1 sponsoring organization" },
    { id: "i94", label: "I-94 Arrival/Departure Record", desc: "Printed from i94.cbp.dhs.gov" },
    { id: "entrydates", label: "U.S. entry/exit dates (by year)", desc: "Check arrival and departure dates by year through passport stamp or I-94 Travel History." },
    { id: "ssn", label: "SSN (or ITIN)", desc: "Social Security Number. If not, it can be replaced with ITIN (Form W-7)" },
    { id: "w2", label: "W-2", desc: "Issued by employer (January-February), salary and withholding tax details" },
    { id: "1042s", label: "1042-S (if applicable)", desc: "If you have income subject to a tax treaty" },
    { id: "1099int", label: "1099-INT (if applicable)", desc: "If you have bank interest income" },
    { id: "1099div", label: "1099-DIV (if applicable)", desc: "If you have dividend income" },
    { id: "1099nec", label: "1099-NEC (if applicable)", desc: "If you have income as an independent contractor (freelancer)" },
    { id: "prev", label: "Copy of previous year's tax return", desc: "If you have previously reported" }],

    form8233: true
  },
  "h1b": {
    label: "H-1B Worker",
    labelKo: "work visa",
    desc: "Workers working in the United States on an H-1B visa",
    sptExemptYears: 0,
    treatyArticle: "Article 20(1)",
    treatyBenefit: "Professor/research income is exempt from tax only if you are a professor/researcher at a university.",
    ficaExempt: false,
    nraToolsOnly: false,
    docs: [
    { id: "passport", label: "Passport", desc: "Original valid passport" },
    { id: "i94", label: "I-94 Arrival/Departure Record", desc: "Printed from i94.cbp.dhs.gov" },
    { id: "entrydates", label: "U.S. entry/exit dates (by year)", desc: "Check arrival and departure dates by year through passport stamp or I-94 Travel History." },
    { id: "ssn", label: "SSN", desc: "Social Security Number (H-1B is subject to SSN issuance)" },
    { id: "w2", label: "W-2", desc: "Issued by employer (January-February), salary and withholding tax details" },
    { id: "1099int", label: "1099-INT (if applicable)", desc: "If you have bank interest income" },
    { id: "1099div", label: "1099-DIV (if applicable)", desc: "If you have dividend income" },
    { id: "1099nec", label: "1099-NEC (if applicable)", desc: "If you have income as an independent contractor (freelancer)" },
    { id: "prev", label: "Copy of previous year's tax return", desc: "If you have previously reported" }],

    form8233: false
  },
  "l1": {
    label: "L-1 Intracompany Transferee",
    labelKo: "Expatriate/Dispatch",
    desc: "Expatriates dispatched or transferred to the United States on an L-1 visa (L-1A manager/L-1B expertise)",
    sptExemptYears: 0,
    treatyArticle: "",
    treatyBenefit: "No general tax exemptions — there are no separate tax treaty exemptions applicable to L-1 holders",
    ficaExempt: false,
    nraToolsOnly: false,
    docs: [
    { id: "passport", label: "Passport", desc: "Original valid passport" },
    { id: "i797", label: "I-797 (Notice of Approval)", desc: "Notice of Action Approval of L-1 Visa Petition" },
    { id: "i94", label: "I-94 Arrival/Departure Record", desc: "Printed from i94.cbp.dhs.gov" },
    { id: "entrydates", label: "U.S. entry/exit dates (by year)", desc: "Check arrival and departure dates by year through passport stamp or I-94 Travel History." },
    { id: "ssn", label: "SSN", desc: "Social Security Number (L-1 is subject to SSN issuance)" },
    { id: "w2", label: "W-2", desc: "Issued by employer (January-February), salary and withholding tax details" },
    { id: "1099int", label: "1099-INT (if applicable)", desc: "If you have bank interest income" },
    { id: "1099div", label: "1099-DIV (if applicable)", desc: "If you have dividend income" },
    { id: "1099nec", label: "1099-NEC (if applicable)", desc: "If you have income as an independent contractor (freelancer)" },
    { id: "totalization", label: "Certificate of application of social security agreement (if applicable)", desc: "Certificate of application of Korea-US Social Security Agreement (Totalization Agreement) when dispatched to headquarters in Korea – issued by National Pension Service" },
    { id: "prev", label: "Copy of previous year's tax return", desc: "If you have previously reported" }],

    form8233: false
  },
  "l2": {
    label: "L-2 Dependent",
    labelKo: "Accompanied by L-2",
    desc: "Spouse or minor child of L-1 holder (L-2 companion visa)",
    sptExemptYears: 0,
    treatyArticle: "",
    treatyBenefit: "Separate tax treaty benefits do not apply to accompanying visa holders.",
    ficaExempt: false,
    nraToolsOnly: false,
    docs: [
    { id: "passport", label: "Passport", desc: "Original valid passport" },
    { id: "i94", label: "I-94 Arrival/Departure Record", desc: "Printed from i94.cbp.dhs.gov" },
    { id: "entrydates", label: "U.S. entry/exit dates (by year)", desc: "Check arrival and departure dates by year through passport stamp or I-94 Travel History." },
    { id: "primarydocs", label: "Copy of visa documents of primary visa holder (L-1)", desc: "Copy of L-1 holder's I-797 approval notice" },
    { id: "ead", label: "EAD (if applicable)", desc: "Employment Authorization Document — Work permit (if employed)" },
    { id: "ssn", label: "SSN (or ITIN)", desc: "If you are employed, you can replace it with your SSN or ITIN (Form W-7)." },
    { id: "w2", label: "W-2 (if applicable)", desc: "If employed, salary history issued by employer" },
    { id: "prev", label: "Copy of previous year's tax return", desc: "If you have previously reported" }],

    form8233: false
  },
  "dependent": {
    label: "Dependent (J-2/F-2/H-4)",
    labelKo: "accompanying visa",
    desc: "Accompanying visa holders such as J-2, F-2, H-4, etc.",
    sptExemptYears: 0,
    treatyArticle: "",
    treatyBenefit: "Separate tax treaty benefits do not apply to accompanying visa holders.",
    ficaExempt: false,
    nraToolsOnly: false,
    docs: [
    { id: "passport", label: "Passport", desc: "Original valid passport" },
    { id: "i94", label: "I-94 Arrival/Departure Record", desc: "Printed from i94.cbp.dhs.gov" },
    { id: "entrydates", label: "U.S. entry/exit dates (by year)", desc: "Check arrival and departure dates by year through passport stamp or I-94 Travel History." },
    { id: "primarydocs", label: "Copy of visa documents of primary visa holder", desc: "Copy of spouse/parent's DS-2019, I-20, or I-797" },
    { id: "ead", label: "EAD (if applicable)", desc: "Employment Authorization Document — Work permit (if employed)" },
    { id: "ssn", label: "SSN (or ITIN)", desc: "If you are employed, you can replace it with your SSN or ITIN (Form W-7)." },
    { id: "w2", label: "W-2 (if applicable)", desc: "If employed, salary history issued by employer" },
    { id: "prev", label: "Copy of previous year's tax return", desc: "If you have previously reported" }],

    form8233: false
  },
  "green-card": {
    label: "Green Card",
    labelKo: "permanent resident",
    desc: "U.S. Permanent Resident Card holders",
    sptExemptYears: 0,
    treatyArticle: "",
    treatyBenefit: "",
    ficaExempt: false,
    nraToolsOnly: false,
    alwaysResident: true,
    worldwideIncome: true,
    efilePrimary: true,
    filingStatuses: ["Single", "Married Filing Jointly (MFJ)", "Married Filing Separately (MFS)", "Head of Household (HoH)", "Qualifying Surviving Spouse (QSS)"],
    standardDeductions: { "Single": "$15,700", "MFJ": "$31,400", "MFS": "$15,700", "HoH": "$23,500", "QSS": "$31,400" },
    docs: [
    { id: "passport", label: "Passport", desc: "Original valid passport" },
    { id: "greencard", label: "Permanent Resident Card (Green Card)", desc: "Form I-551, Permanent Resident Card" },
    { id: "ssn", label: "SSN", desc: "Social Security Number (permanent residents are subject to SSN issuance)" },
    { id: "w2", label: "W-2", desc: "Issued by employer (January-February), salary and withholding tax details" },
    { id: "1099int", label: "1099-INT (if applicable)", desc: "If you have bank interest income" },
    { id: "1099div", label: "1099-DIV (if applicable)", desc: "If you have dividend income" },
    { id: "1099nec", label: "1099-NEC (if applicable)", desc: "If you have income as an independent contractor (freelancer)" },
    { id: "kr-income", label: "Korea Income Data", desc: "Income details such as Korean earned income, business income, interest, dividends, etc. (Home Tax Income Amount Certification)" },
    { id: "kr-tax", label: "Korean tax payment proof", desc: "Home tax payment certificate, withholding tax receipt, etc. (required when applying to FTC)" },
    { id: "bank-foreign", label: "Foreign financial account information (FBAR/FATCA)", desc: "Highest balance of the year in Korean bank, securities, and insurance accounts (FBAR required if combined exceeds $10,000)" },
    { id: "form2555", label: "Form 2555 related materials (if applicable)", desc: "When applying for the Foreign Earned Income Tax Credit (FEIE) — proof of overseas residence, employment contract, etc." },
    { id: "form1116", label: "Form 1116 related materials (if applicable)", desc: "When applying for Foreign Tax Credit (FTC) — Korean tax receipt" },
    { id: "prev", label: "Copy of previous year's tax return", desc: "If you have previously reported" }],

    form8233: false
  },
  "citizen": {
    label: "US Citizen",
    labelKo: "citizen",
    desc: "Korean citizen who acquired U.S. citizenship",
    sptExemptYears: 0,
    treatyArticle: "",
    treatyBenefit: "",
    ficaExempt: false,
    nraToolsOnly: false,
    alwaysResident: true,
    worldwideIncome: true,
    efilePrimary: true,
    filingStatuses: ["Single", "Married Filing Jointly (MFJ)", "Married Filing Separately (MFS)", "Head of Household (HoH)", "Qualifying Surviving Spouse (QSS)"],
    standardDeductions: { "Single": "$15,700", "MFJ": "$31,400", "MFS": "$15,700", "HoH": "$23,500", "QSS": "$31,400" },
    docs: [
    { id: "passport", label: "US Passport", desc: "Valid U.S. passport or proof of citizenship" },
    { id: "ssn", label: "SSN", desc: "Social Security Number" },
    { id: "w2", label: "W-2", desc: "Issued by employer (January-February), salary and withholding tax details" },
    { id: "1099int", label: "1099-INT (if applicable)", desc: "If you have bank interest income" },
    { id: "1099div", label: "1099-DIV (if applicable)", desc: "If you have dividend income" },
    { id: "1099nec", label: "1099-NEC (if applicable)", desc: "If you have income as an independent contractor (freelancer)" },
    { id: "kr-income", label: "Korea Income Data", desc: "Income details such as Korean earned income, business income, interest, dividends, etc. (Home Tax Income Amount Certification)" },
    { id: "kr-tax", label: "Korean tax payment proof", desc: "Home tax payment certificate, withholding tax receipt, etc. (required when applying to FTC)" },
    { id: "bank-foreign", label: "Foreign financial account information (FBAR/FATCA)", desc: "Highest balance of the year in Korean bank, securities, and insurance accounts (FBAR required if combined exceeds $10,000)" },
    { id: "form2555", label: "Form 2555 related materials (if applicable)", desc: "When applying for the Foreign Earned Income Tax Credit (FEIE) — proof of overseas residence, employment contract, etc." },
    { id: "form1116", label: "Form 1116 related materials (if applicable)", desc: "When applying for Foreign Tax Credit (FTC) — Korean tax receipt" },
    { id: "prev", label: "Copy of previous year's tax return", desc: "If you have previously reported" }],

    form8233: false
  }
};

const RESIDENT_REFERENCE_LINKS: {label: string;url: string;desc: string;}[] = [
{ label: "Publication 519 — U.S. Tax Guide for Aliens", url: "https://www.irs.gov/publications/p519", desc: "A Comprehensive Guide to US Taxes for Foreigners" },
{ label: "Publication 514 — Foreign Tax Credit for Individuals", url: "https://www.irs.gov/publications/p514", desc: "Detailed information on Foreign Tax Credit (FTC)" },
{ label: "Form 1040 — U.S. Individual Income Tax Return", url: "https://www.irs.gov/forms-pubs/about-form-1040", desc: "US Individual Income Tax Return Form" },
{ label: "Form 4868 — Application for Extension", url: "https://www.irs.gov/forms-pubs/about-form-4868", desc: "Application for tax return deadline extension (6 month automatic extension)" },
{ label: "Form 2555 — Foreign Earned Income Exclusion", url: "https://www.irs.gov/forms-pubs/about-form-2555", desc: "Foreign Earned Income Credit (FEIE) Application Form" },
{ label: "Form 1116 — Foreign Tax Credit", url: "https://www.irs.gov/forms-pubs/about-form-1116", desc: "Foreign Tax Credit (FTC) Application Form" },
{ label: "Form 8938 — FATCA (Statement of Foreign Financial Assets)", url: "https://www.irs.gov/forms-pubs/about-form-8938", desc: "Foreign financial asset reporting (FATCA)" },
{ label: "Form 8833 — Treaty-Based Return Position", url: "https://www.irs.gov/forms-pubs/about-form-8833", desc: "Tax treaty-based position disclosure" },
{ label: "Form 3520 — Foreign Trusts & Gifts", url: "https://www.irs.gov/forms-pubs/about-form-3520", desc: "Overseas trust/gift/inheritance report (over $100K)" },
{ label: "Form 5471 — Foreign Corporation", url: "https://www.irs.gov/forms-pubs/about-form-5471", desc: "Reporting of foreign corporation shares" },
{ label: "Form 8865 — Foreign Partnership", url: "https://www.irs.gov/forms-pubs/about-form-8865", desc: "Foreign partnership reporting" },
{ label: "Form 8621 — PFIC", url: "https://www.irs.gov/forms-pubs/about-form-8621", desc: "Passive Foreign Investment Company Report (Korean Fund/ETF)" },
{ label: "Form 8858 — Foreign Disregarded Entity", url: "https://www.irs.gov/forms-pubs/about-form-8858", desc: "Overseas disregarded entity reporting" },
{ label: "Form 3520-A — Foreign Trust Annual Report", url: "https://www.irs.gov/forms-pubs/about-form-3520-a", desc: "Foreign Trust Annual Report" },
{ label: "FinCEN FBAR (BSA E-Filing)", url: "https://bsaefiling.fincen.treas.gov/", desc: "Foreign Financial Account Reporting — FinCEN 114 Electronic Filing" },
{ label: "IRS Yearly Average Currency Exchange Rates", url: "https://www.irs.gov/individuals/international-taxpayers/yearly-average-currency-exchange-rates", desc: "IRS official average annual exchange rate (Korean won → US dollar)" },
{ label: "Korea-US Tax Treaty", url: "https://www.irs.gov/businesses/international-businesses/united-states-income-tax-treaties-a-to-z", desc: "Full text of the Korea-U.S. tax treaty — including the Saving Clause" },
{ label: "FBAR vs Form 8938 Comparison", url: "https://www.irs.gov/businesses/comparison-of-form-8938-and-fbar-requirements", desc: "Difference Between FBAR and Form 8938 Formula Comparison Table" }];


const NO_TAX_STATES = [
"Alaska", "Florida", "Nevada", "New Hampshire",
"South Dakota", "Tennessee", "Texas", "Washington", "Wyoming"];


interface SearchEntry {
  term: string;
  termKo: string;
  desc: string;
  step: number;
  keywords: string[];
}

const SEARCH_INDEX: SearchEntry[] = [
{ term: "SPT", termKo: "Substantial Retention Test", desc: "Substantial Presence Test — Determination of residency for 183 days", step: 1, keywords: ["substantial presence", "183 days", "Resident determination", "Number of days of stay"] },
{ term: "NRA", termKo: "non-resident alien", desc: "Non-Resident Alien — Non-resident for tax purposes", step: 1, keywords: ["non-resident alien", "non-resident", "foreigner"] },
{ term: "Exempt Individual", termKo: "Exempted", desc: "F/J visa holders excluded from SPT stay count", step: 1, keywords: ["exempt", "exemption", "f-1", "j-1", "Excluding days of stay"] },
{ term: "Form 1040-NR", termKo: "Nonresident Income Tax Return", desc: "Federal Income Tax Return Form for Nonresident Aliens", step: 4, keywords: ["1040-NR", "1040NR", "Non-resident reporting", "federal tax"] },
{ term: "Form 1040", termKo: "income tax return", desc: "Federal Income Tax Return Form for U.S. Residents/Citizens", step: 4, keywords: ["1040", "Resident Report", "federal tax", "individual income tax"] },
{ term: "W-2", termKo: "pay stub", desc: "Annual salary and withholding statement issued by your employer", step: 3, keywords: ["w2", "salary", "wage", "withholding tax", "employer"] },
{ term: "1042-S", termKo: "Tax Treaty Income Statement", desc: "Withholding tax statement for income subject to tax treaty", step: 3, keywords: ["1042s", "1042-s", "tax treaty income", "withholding tax"] },
{ term: "1099 series", termKo: "Other Income Statements", desc: "Income statement including interest (INT), dividends (DIV), freelance (NEC), etc.", step: 3, keywords: ["1099", "1099-int", "1099-div", "1099-nec", "interest", "allocation", "freelancer"] },
{ term: "FBAR", termKo: "Overseas financial account reporting", desc: "FinCEN 114 — Reporting obligations when combined foreign financial accounts exceed $10,000", step: 4, keywords: ["fbar", "fincen", "114", "overseas account", "overseas finance", "$10,000", "ten thousand dollars"] },
{ term: "FATCA / Form 8938", termKo: "Reporting of overseas financial assets", desc: "Report to IRS when overseas financial assets exceed a certain amount", step: 4, keywords: ["fatca", "8938", "form 8938", "overseas financial assets", "foreign financial assets"] },
{ term: "FBAR vs Form 8938", termKo: "Comparison of FBAR and 8938", desc: "FBAR reports to FinCEN, 8938 reports to IRS — base amount and target are different", step: 4, keywords: ["fbar 8938 comparison", "fbar vs", "difference", "fincen irs"] },
{ term: "Form 8843", termKo: "Exemption Report", desc: "Proof of residence status form that F/J visa holders must submit annually", step: 4, keywords: ["8843", "form 8843", "exempt individual statement", "f visa", "j visa"] },
{ term: "FTC / Form 1116", termKo: "Foreign tax credit", desc: "Foreign Tax Credit — Tax paid in Korea is deducted from U.S. taxes", step: 4, keywords: ["ftc", "foreign tax credit", "1116", "form 1116", "Foreign tax amount paid", "double taxation"] },
{ term: "FEIE / Form 2555", termKo: "Overseas earned income deduction", desc: "Foreign Earned Income Exclusion — up to $130,000 of foreign earned income excluded.", step: 4, keywords: ["feie", "2555", "form 2555", "overseas earned income", "foreign earned income", "$130,000"] },
{ term: "Form 8833", termKo: "Tax treaty position disclosure", desc: "Treaty-Based Return Position Disclosure — Submitted when applying tax treaty benefits", step: 2, keywords: ["8833", "form 8833", "treaty disclosure", "treaty position", "Tax treaty disclosure"] },
{ term: "SSN", termKo: "social security number", desc: "Social Security Number — A unique number issued in the United States.", step: 3, keywords: ["ssn", "social security", "social security", "social security number"] },
{ term: "ITIN", termKo: "Individual Taxpayer Identification Number", desc: "Individual Taxpayer Identification Number — Number for tax reporting when you do not have an SSN", step: 3, keywords: ["itin", "w-7", "form w-7", "taxpayer number", "taxpayer identification"] },
{ term: "Tax Treaty", termKo: "Korea-US Tax Treaty", desc: "Double taxation prevention and tax reduction agreement between Korea and the United States", step: 2, keywords: ["tax treaty", "tax treaty", "Korean and American", "double taxation", "korea us treaty"] },
{ term: "Saving Clause", termKo: "Saving Close", desc: "Tax treaty benefits limited for U.S. residents — however, exceptions exist.", step: 2, keywords: ["saving clause", "Savings", "resident restrictions", "treaty exceptions"] },
{ term: "Standard Deduction", termKo: "standard deduction", desc: "Basic income deduction applicable to residents (2025: Single $15,700)", step: 4, keywords: ["standard deduction", "standard deduction", "basic deduction", "$15,700", "Deductible amount"] },
{ term: "Filing Status", termKo: "reporting status", desc: "Status selected when reporting taxes, such as Single, MFJ, MFS, HoH, etc.", step: 4, keywords: ["filing status", "reporting status", "Report status", "single", "married"] },
{ term: "MFJ", termKo: "Married couple filing jointly", desc: "Married Filing Jointly — Filing taxes jointly with your spouse", step: 4, keywords: ["mfj", "married filing jointly", "couple jointly", "joint filing"] },
{ term: "Schedule B", termKo: "Interest and dividend income statement", desc: "Schedule attached when interest or dividend income exceeds $1,500", step: 4, keywords: ["schedule b", "interest dividend", "$1,500", "interest dividends"] },
{ term: "Form 3520", termKo: "Overseas gift/inheritance report", desc: "Report when receiving overseas gifts/inheritance exceeding $100,000", step: 4, keywords: ["3520", "form 3520", "overseas gift", "succession", "gift", "$100,000", "foreign trust"] },
{ term: "Form 5471", termKo: "Overseas corporation reporting", desc: "Reported when holding more than 10% of shares in an overseas corporation", step: 4, keywords: ["5471", "form 5471", "overseas corporation", "foreign corporation", "stake"] },
{ term: "PFIC / Form 8621", termKo: "Overseas investment fund report", desc: "Report on passive foreign investment companies such as Korean funds and ETFs", step: 4, keywords: ["pfic", "8621", "form 8621", "overseas fund", "etf", "passive foreign"] },
{ term: "TurboTax", termKo: "turbo tax", desc: "Popular US tax preparation software (for residents)", step: 6, keywords: ["turbotax", "turbo tax", "intuit", "intuit"] },
{ term: "Sprintax", termKo: "Sprintax", desc: "Professional tax reporting software for non-resident aliens", step: 6, keywords: ["sprintax", "Sprintax", "Non-resident software", "nra software"] },
{ term: "H&R Block", termKo: "H&R Block", desc: "US tax reporting service (face-to-face + online)", step: 6, keywords: ["h&r block", "H&R", "hr block", "tax service"] },
{ term: "FreeTaxUSA", termKo: "Freetax USA", desc: "Free Federal Tax Filing Software (for residents)", step: 6, keywords: ["freetaxusa", "freetax", "free report", "free filing"] },
{ term: "e-file", termKo: "Electronic reporting", desc: "File your tax return online with the IRS", step: 6, keywords: ["e-file", "efile", "Electronic reporting", "Report online", "electronic submission"] },
{ term: "State Tax", termKo: "state income tax", desc: "Income tax paid separately to the state of residence in addition to federal taxes", step: 5, keywords: ["state tax", "state tax", "state income tax", "state income tax", "state of residence"] },
{ term: "FICA", termKo: "Social Security Tax + Medicare", desc: "Social Security (6.2%) + Medicare (1.45%) — F/J visa NRA exempt", step: 4, keywords: ["fica", "social security tax", "medicare", "social security tax", "medicare", "6.2%", "1.45%"] },
{ term: "Form 4868", termKo: "Extension of reporting deadline", desc: "Application for automatic 6 month extension of tax filing deadline", step: 6, keywords: ["4868", "form 4868", "extension", "prolongation", "deadline extension", "6 months"] },
{ term: "IRS Where's My Refund", termKo: "Refund Inquiry", desc: "Check your refund progress on the IRS website", step: 7, keywords: ["where's my refund", "Refund Inquiry", "refund status", "Refund Status", "Check your refund"] },
{ term: "Direct Deposit", termKo: "Direct deposit to account", desc: "How to have your refund deposited directly into your bank account", step: 7, keywords: ["direct deposit", "direct deposit", "bank deposit", "Refund deposit"] },
{ term: "Tax Refund", termKo: "tax refund", desc: "Amount refunded when withheld tax is more than actual tax amount", step: 7, keywords: ["refund", "refund", "tax refund", "tax refund", "get it back"] },
{ term: "Withholding", termKo: "withholding tax", desc: "Tax deducted from your salary in advance by your employer and paid to the IRS", step: 3, keywords: ["withholding", "withholding tax", "tax deduction", "Pay in advance"] },
{ term: "Publication 519", termKo: "Foreign Tax Guide", desc: "IRS Comprehensive Guide to U.S. Taxes for Foreigners", step: 4, keywords: ["pub 519", "publication 519", "foreign guide", "aliens tax guide"] },
{ term: "Article 20(1)", termKo: "Teaching/research provisions", desc: "Korea-U.S. Tax Treaty — Income from teaching and research activities is tax exempt for up to 2 years", step: 2, keywords: ["article 20", "professor", "research", "2 years tax exemption", "professor"] },
{ term: "Article 21(1)", termKo: "student provisions", desc: "Korea-U.S. Tax Treaty — International students’ tuition and scholarships are tax-exempt, and up to $2,000 of income from living expenses is tax-exempted.", step: 2, keywords: ["article 21", "student", "scholarship", "$2,000", "student"] },
{ term: "Dual-Status", termKo: "dual identity", desc: "When both non-resident and resident status apply in the same year", step: 1, keywords: ["dual status", "dual identity", "dual-status", "non-resident resident"] },
{ term: "Form W-7", termKo: "ITIN Application", desc: "Individual Taxpayer Identification Number Application Form", step: 3, keywords: ["w-7", "w7", "form w-7", "apply for itin", "Apply for tax number"] },
{ term: "Form 8233", termKo: "Apply for tax treaty exemption", desc: "Form to be submitted to employer to receive tax treaty exemption from salary", step: 2, keywords: ["8233", "form 8233", "Apply for tax exemption", "withholding exemption", "treaty exemption"] },
{ term: "tax filing deadline", termKo: "deadline", desc: "April 15 (automatically extended to June 15 if submitted by mail to non-residents)", step: 6, keywords: ["deadline", "deadline", "April 15th", "June 15th", "filing deadline", "due date"] },
{ term: "Form 8858", termKo: "Overseas business reporting", desc: "Foreign Disregarded Entity Reporting Form", step: 4, keywords: ["8858", "form 8858", "disregarded entity", "overseas business"] },
{ term: "Worldwide Income", termKo: "worldwide income", desc: "Residents and citizens must report all worldwide income to the United States.", step: 4, keywords: ["worldwide income", "worldwide income", "foreign income", "global income", "all income"] },
{ term: "IRS average annual exchange rate", termKo: "Average annual exchange rate", desc: "IRS official exchange rate used when converting Korean Won to US Dollars", step: 4, keywords: ["exchange rate", "exchange rate", "Average annual exchange rate", "won dollar", "currency"] },
{ term: "L-1 (expatriate/dispatch)", termKo: "expatriate visa", desc: "L-1 Visa — Intracompany Transferee, no SPT exemption", step: 0, keywords: ["l-1", "l1", "expatriate", "detachment", "intracompany", "transferee", "l-1a", "l-1b"] },
{ term: "L-2 (accompanying visa)", termKo: "L-2 companion visa", desc: "Visa for spouse/children of L-1 holder", step: 0, keywords: ["l-2", "l2", "l2 accompanying", "l-2 accompanying", "lVisa required"] },
{ term: "Totalization Agreement", termKo: "Korea-US Social Security Agreement", desc: "Korea-US Social Security Agreement — L-1 expatriates may be exempted from FICA", step: 2, keywords: ["totalization", "social security agreement", "totalization agreement", "national pension", "fica exemption", "detachment"] }];


/* ================================================================
   UI PRIMITIVES
   ================================================================ */

function T({ children, tip }: {children: ReactNode;tip: string;}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{top: number;left: number;arrowLeft: number;below: boolean;} | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  const isTouch = useRef(false);

  useEffect(() => {setMounted(true);}, []);

  // Auto-close on scroll
  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  const reposition = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const tipW = Math.min(300, window.innerWidth - 32);
    let left = rect.left + rect.width / 2 - tipW / 2;
    const arrowIdeal = tipW / 2;
    let arrowLeft = arrowIdeal;

    if (left < 16) {
      arrowLeft = arrowIdeal + (left - 16);
      left = 16;
    } else if (left + tipW > window.innerWidth - 16) {
      const overflow = left + tipW - (window.innerWidth - 16);
      arrowLeft = arrowIdeal + overflow;
      left = window.innerWidth - 16 - tipW;
    }
    arrowLeft = Math.max(12, Math.min(tipW - 12, arrowLeft));

    const below = rect.top <= 80;
    const top = below ? rect.bottom + 10 : rect.top - 10;
    setPos({ top, left, arrowLeft, below });
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
        aria-label={`${typeof children === "string" ? children : "terminology"} See description`}
        onTouchStart={() => {isTouch.current = true;}}
        onClick={(e) => {
          e.stopPropagation();
          if (open) handleClose();else
          handleOpen();
        }}
        onMouseEnter={() => {if (!isTouch.current) handleOpen();}}
        onMouseLeave={() => {if (!isTouch.current) handleClose();}}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (open) handleClose();else
            handleOpen();
          }
          if (e.key === "Escape") handleClose();
        }}>
        
        {children}
      </span>
      {mounted && open && pos && createPortal(
        <>
          {/* Mobile backdrop — tap to dismiss */}
          <div className="tt-backdrop" onClick={(e) => {e.stopPropagation();handleClose();}} />
          <span
            className="tt-portal"
            role="tooltip"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              ...(pos.below ?
              { top: `${pos.top}px` } :
              { bottom: `${window.innerHeight - pos.top}px` }),
              left: `${pos.left}px`,
              zIndex: 9998
            }}>
            
            <span className="tt-badge">?</span>
            {tip}
            {pos.below ?
            <span className="tt-arrow-top" style={{ left: `${pos.arrowLeft}px` }} /> :
            <span className="tt-arrow" style={{ left: `${pos.arrowLeft}px` }} />}
          </span>
        </>,
        document.body
      )}
    </>);

}

function Code({ children }: {children: ReactNode;}) {
  return (
    <code
      className="font-[family-name:var(--font-mono)] text-[0.85em] px-1.5 py-0.5 rounded"
      style={{ background: "var(--rule-light)", color: "var(--accent)" }}>
      
      {children}
    </code>);

}

function Callout({
  type,
  label,
  children




}: {type: "warn" | "info" | "tip";label?: string;children: ReactNode;}) {
  const styles = {
    warn: {
      border: "var(--accent)",
      bg: "var(--accent-bg)",
      text: "var(--accent)",
      labelBg: "var(--accent)"
    },
    info: {
      border: "var(--rule)",
      bg: "var(--paper)",
      text: "var(--ink-light)",
      labelBg: "var(--ink)"
    },
    tip: {
      border: "var(--moss)",
      bg: "var(--moss-bg)",
      text: "var(--moss)",
      labelBg: "var(--moss)"
    }
  };
  const s = styles[type];

  return (
    <div
      className="my-6"
      style={{ borderLeft: `3px solid ${s.border}`, background: s.bg }}>
      
      <div className="px-5 py-4">
        {label &&
        <span
          className="inline-block text-[11px] font-[family-name:var(--font-mono)] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded-sm mb-2"
          style={{ background: s.labelBg }}>
          
            {label}
          </span>
        }
        <div
          className="text-sm leading-relaxed"
          style={{ color: s.text }}>
          
          {children}
        </div>
      </div>
    </div>);

}

function SectionLabel({ children }: {children: ReactNode;}) {
  return (
    <h3
      className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.15em] mt-10 mb-4 pb-2"
      style={{ color: "var(--ink-muted)", borderBottom: "1px solid var(--rule)" }}>
      
      {children}
    </h3>);

}

function Prose({ children }: {children: ReactNode;}) {
  return (
    <div className="text-[15px] leading-[1.8]" style={{ color: "var(--ink-light)" }}>
      {children}
    </div>);

}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function TaxGuideEn() {
  const [step, setStep] = useState(() => loadFromLS(LS_KEYS.step, 0));
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(
    () => new Set(loadFromLS<string[]>(LS_KEYS.checkedDocs, []))
  );
  const [arrivalYear, setArrivalYear] = useState(() =>
  loadFromLS(LS_KEYS.arrivalYear, "")
  );
  const [visited, setVisited] = useState<Set<number>>(
    () => new Set(loadFromLS<number[]>(LS_KEYS.visited, [0]))
  );
  const [visaType, setVisaType] = useState<VisaType | "">(() =>
  loadFromLS<VisaType | "">(LS_KEYS.visaType, "")
  );
  const [direction, setDirection] = useState<"left" | "right" | "none">("none");
  const [searchOpen, setSearchOpen] = useState(false);

  /* Persist to localStorage on change */
  useEffect(() => {saveToLS(LS_KEYS.step, step);}, [step]);
  useEffect(() => {saveToLS(LS_KEYS.checkedDocs, [...checkedDocs]);}, [checkedDocs]);
  useEffect(() => {saveToLS(LS_KEYS.arrivalYear, arrivalYear);}, [arrivalYear]);
  useEffect(() => {saveToLS(LS_KEYS.visited, [...visited]);}, [visited]);
  useEffect(() => {saveToLS(LS_KEYS.visaType, visaType);}, [visaType]);

  const goTo = (s: number, dir?: "left" | "right") => {
    if (s === step) return;
    setDirection(dir ?? (s > step ? "left" : "right"));
    setStep(s);
    setVisited((prev) => new Set(prev).add(s));
    // iOS Safari에서 smooth scrollTo가 동작하지 않는 문제 대응
    window.scrollTo(0, 0);
    setTimeout(() => window.scrollTo(0, 0), 50);
  };
  const goNext = () => {if (step < STEPS.length - 1) goTo(step + 1, "left");};
  const goPrev = () => {if (step > 0) goTo(step - 1, "right");};

  const toggleDoc = (id: string) => {
    setCheckedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);else
      next.add(id);
      return next;
    });
  };

  /* ---- Keyboard navigation (← → arrows) + Cmd/Ctrl+K search ---- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K → toggle search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      if (searchOpen) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") {goNext();} else
      if (e.key === "ArrowLeft") {goPrev();}
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  /* ---- Mobile swipe gestures ---- */
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (searchOpen) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (searchOpen) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0) goNext();else
      goPrev();
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  });

  /* ---- Auto-hide header on scroll down, show on scroll up ---- */
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const THRESHOLD = 10;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 48) {
        // Always show header near top
        setHeaderHidden(false);
      } else if (y - lastScrollY.current > THRESHOLD) {
        setHeaderHidden(true);
      } else if (lastScrollY.current - y > THRESHOLD) {
        setHeaderHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const arrivalNum = parseInt(arrivalYear);
  const isValidYear = !isNaN(arrivalNum) && arrivalNum >= 2015 && arrivalNum <= 2026;
  const visa = visaType ? VISA_CONFIGS[visaType] : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ---- Top bar ---- */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md transition-transform duration-300 ease-out"
        style={{
          background: "rgba(247, 248, 250, 0.85)",
          borderBottom: "1px solid var(--rule)",
          transform: headerHidden ? "translateY(-100%)" : "translateY(0)"
        }}>
        
        <div className="max-w-[680px] mx-auto px-5 sm:px-8 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.12em] uppercase"
              style={{ color: "var(--ink-muted)" }}>
              
              US Tax Guide
            </span>
            {visa &&
            <span
              className="font-[family-name:var(--font-mono)] text-[10px] font-bold px-1.5 py-0.5 rounded-sm"
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              
                {visa.label}
              </span>
            }
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors"
              style={{ background: "var(--rule-light)", cursor: "pointer", border: "none" }}
              aria-label="Open Search (Cmd+K)"
              title="Search (⌘K)">
              
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="hidden sm:inline font-[family-name:var(--font-mono)] text-[10px]" style={{ color: "var(--ink-faint)" }}>⌘K</span>
            </button>
            <span
              className="font-[family-name:var(--font-mono)] text-[11px] tabular-nums"
              style={{ color: "var(--ink-faint)" }}>
              
              {String(step + 1).padStart(2, "0")}/{String(STEPS.length).padStart(2, "0")}
            </span>
          </div>
        </div>
        {/* progress */}
        <div className="h-[2px]" style={{ background: "var(--rule-light)" }}>
          <div
            className="h-full transition-all duration-700 ease-out"
            style={{
              width: `${(step + 1) / STEPS.length * 100}%`,
              background: "var(--accent)"
            }} />
          
        </div>
      </header>

      <div className="max-w-[680px] mx-auto px-5 sm:px-8">
        {/* ---- Step nav (desktop) ---- */}
        <nav
          className="hidden md:flex items-center gap-0 pt-8 pb-2 overflow-x-auto"
          style={{ borderBottom: "1px solid var(--rule)" }}>
          
          {STEPS.map((title, i) =>
          <button
            key={i}
            onClick={() => goTo(i)}
            className="relative px-3 py-2 text-[12.5px] font-medium transition-colors whitespace-nowrap"
            style={{
              color: i === step ? "var(--accent)" : visited.has(i) ? "var(--ink-light)" : "var(--ink-faint)"
            }}>
            
              <span className="font-[family-name:var(--font-mono)] mr-1.5" style={{ fontSize: "10px" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {title}
              {i === step &&
            <span
              className="absolute bottom-0 left-3 right-3 h-[2px]"
              style={{ background: "var(--accent)" }} />

            }
            </button>
          )}
        </nav>

        {/* ---- Mobile step label ---- */}
        <div className="md:hidden pt-8 flex items-center gap-2">
          <span
            className="font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.12em] uppercase"
            style={{ color: "var(--accent)" }}>
            
            Step {String(step + 1).padStart(2, "0")}
          </span>
          <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>&mdash;</span>
          <span className="text-[11px] font-medium" style={{ color: "var(--ink-muted)" }}>
            {STEPS[step]}
          </span>
        </div>

        {/* ---- Content ---- */}
        <main
          className={`pt-8 pb-32 ${direction === "left" ? "animate-step-left" : direction === "right" ? "animate-step-right" : "animate-step"}`}
          key={step}>
          
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
            borderTop: "1px solid var(--rule)"
          }}>
          
          <div className="max-w-[680px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={step === 0}
              className="text-sm font-medium transition-opacity"
              style={{
                color: step === 0 ? "var(--ink-faint)" : "var(--ink-light)",
                opacity: step === 0 ? 0.4 : 1,
                cursor: step === 0 ? "default" : "pointer"
              }}>
              
              ← Previous
            </button>

            {/* dot indicators */}
            <div className="flex items-center gap-[6px]">
              {STEPS.map((_, i) =>
              <button
                key={i}
                onClick={() => goTo(i)}
                className="transition-all duration-300"
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === step ? "var(--accent)" : visited.has(i) ? "var(--ink-faint)" : "var(--rule)"
                }} />

              )}
            </div>

            <button
              onClick={step === STEPS.length - 1 ? () => goTo(0, "right") : goNext}
              className="text-sm font-medium"
              style={{ color: "var(--accent)" }}>
              
              {step === STEPS.length - 1 ? "Start Over" : "Next →"}
            </button>
          </div>
        </div>
      </div>

      {/* Search modal */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </div>);


  /* ==============================================================
     STEP 0 — 시작하기
     ============================================================== */

  function Step0() {
    const isResident = visaType === "green-card" || visaType === "citizen";

    const visaOptions: {key: VisaType;label: string;labelKo: string;}[] = [
    { key: "f1-student", label: "F-1", labelKo: "international student" },
    { key: "j1-researcher", label: "J-1", labelKo: "Researcher/Professor" },
    { key: "j1-student", label: "J-1", labelKo: "exchange student" },
    { key: "h1b", label: "H-1B", labelKo: "work visa" },
    { key: "l1", label: "L-1", labelKo: "Expatriate/Dispatch" },
    { key: "dependent", label: "accompanying visa", labelKo: "J-2/F-2/H-4" },
    { key: "l2", label: "L-2", labelKo: "Accompanied by L-2" }];


    const residentOptions: {key: VisaType;label: string;labelKo: string;}[] = [
    { key: "green-card", label: "Green Card", labelKo: "permanent resident" },
    { key: "citizen", label: "US Citizen", labelKo: "citizen" }];


    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(28px,5vw,42px)] font-black leading-[1.15] tracking-tight mb-3"
          style={{ color: "var(--ink)" }}>
          
          U.S. Tax Filing,
          <br />
          made clear for first-time filers.
        </h1>
        <p className="text-[15px] mb-10" style={{ color: "var(--ink-muted)" }}>
          {isResident ?
          "A step-by-step filing guide for Korean permanent residents and U.S. citizens." :
          "A step-by-step filing guide for Korean visa holders in the U.S."}
        </p>

        {/* ---- Visa selector ---- */}
        <SectionLabel>Visa Holder</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
          {visaOptions.map((opt) => {
            const selected = visaType === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => {
                  setDirection("none");
                  setVisaType(opt.key);
                  setCheckedDocs(new Set());
                }}
                className="visa-card text-left p-4"
                style={{
                  background: selected ? "var(--ink)" : "var(--paper)",
                  border: `1.5px solid ${selected ? "var(--ink)" : "var(--rule)"}`,
                  borderRadius: 4,
                  cursor: "pointer"
                }}>
                
                <p
                  className="font-[family-name:var(--font-mono)] text-[12px] font-bold uppercase tracking-wide mb-1"
                  style={{ color: selected ? "var(--accent-soft)" : "var(--accent)" }}>
                  
                  {opt.label}
                </p>
                <p
                  className="text-[14px] font-medium"
                  style={{ color: selected ? "var(--paper)" : "var(--ink)" }}>
                  
                  {opt.labelKo}
                </p>
              </button>);

          })}
        </div>

        <SectionLabel>Permanent Resident / Citizen</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
          {residentOptions.map((opt) => {
            const selected = visaType === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => {
                  setDirection("none");
                  setVisaType(opt.key);
                  setCheckedDocs(new Set());
                }}
                className="visa-card text-left p-4"
                style={{
                  background: selected ? "var(--ink)" : "var(--paper)",
                  border: `1.5px solid ${selected ? "var(--ink)" : "var(--rule)"}`,
                  borderRadius: 4,
                  cursor: "pointer"
                }}>
                
                <p
                  className="font-[family-name:var(--font-mono)] text-[12px] font-bold uppercase tracking-wide mb-1"
                  style={{ color: selected ? "var(--accent-soft)" : "var(--accent)" }}>
                  
                  {opt.label}
                </p>
                <p
                  className="text-[14px] font-medium"
                  style={{ color: selected ? "var(--paper)" : "var(--ink)" }}>
                  
                  {opt.labelKo}
                </p>
              </button>);

          })}
        </div>

        <div key={visaType || "empty"} className={visaType ? "animate-visa-content" : ""}>
        {!visaType &&
          <Callout type="info" label="Start Here">
            Select your visa or status first. We will show a tailored filing path for your case.
          </Callout>
          }

        {visa && isResident ?
          <>
            <Callout type="tip" label={`${visa.label} ${visa.labelKo}`}>
              {visa.desc}
            </Callout>

            <Callout type="info" label="Key Concept">
              <strong>“Tax Return” ≠ “Refund”</strong>
              <br /><br />
              Filing a tax return means <strong>reporting last year&apos;s income to the IRS</strong>, and eligible taxpayers must file.
              A refund is separate: you receive money back only if your withholding exceeded your final tax due.
              <strong>You may also owe additional tax</strong> after filing.
            </Callout>

            {/* Key numbers — Resident */}
            <div
              className="grid grid-cols-3 gap-px my-10 overflow-hidden"
              style={{ background: "var(--rule)", borderRadius: 2 }}>
              
              {[
              { label: "Tax year", value: "2025", sub: "Income earned in 2025" },
              { label: "Deadline", value: "4.15", sub: "Wednesday, April 15, 2026" },
              { label: "Estimated cost", value: "$0–50", sub: "Software fee" }].
              map((item) =>
              <div
                key={item.label}
                className="text-center py-5 px-3"
                style={{ background: "var(--paper)" }}>
                
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
              )}
            </div>

            <SectionLabel>Filing Deadlines</SectionLabel>
            <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
              {[
              {
                case_: "General Deadline",
                date: "April 15, 2026",
                note: "Default deadline for residents within the United States"
              },
              {
                case_: "Automatic Extension (Form 4868)",
                date: "October 15, 2026",
                note: "Automatic extension for 6 months when Form 4868 is submitted by April 15th"
              },
              {
                case_: "Automatic extension for overseas residents",
                date: "June 15, 2026",
                note: "Automatic 2-month extension if you live outside the U.S. at the end of the tax year"
              }].
              map((item) =>
              <div
                key={item.case_}
                className="flex flex-col gap-1 py-3.5"
                style={{ borderBottom: "1px solid var(--rule-light)" }}>
                
                  <p className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                    {item.case_}
                  </p>
                  <div className="flex items-center gap-3">
                    <span
                    className="font-[family-name:var(--font-mono)] text-[13px] font-bold"
                    style={{ color: "var(--accent)" }}>
                    
                      {item.date}
                    </span>
                    <span className="text-[12px]" style={{ color: "var(--ink-faint)" }}>
                      {item.note}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <SectionLabel>Forms You Will File</SectionLabel>
            <Prose>
              <p className="mb-4">Permanent residents/citizens always use Form 1040 as a resident:</p>
            </Prose>
            <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
              <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--accent)" }}>Form 1040</span>
                  <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                    U.S. Personal Income Tax Return
                  </span>
                </div>
                <p className="text-[13px] ml-[88px]" style={{ color: "var(--ink-muted)" }}>
                  Written using general software such as TurboTax, H&R Block, FreeTaxUSA, etc. E-file possible
                </p>
              </div>
            </div>

            <SectionLabel>What's covered in this guide</SectionLabel>
            <div className="space-y-3">
              {[
              "Residency Verification and Filing Status",
              "Avoiding Double Taxation — FTC & FEIE",
              "Required Document Checklist",
              "Federal Taxes — Worldwide Income + FBAR/FATCA",
              "How to report state tax",
              "Submit documents (e-file)",
              "Refund tracking and reference links"].
              map((item, i) =>
              <div key={i} className="flex items-baseline gap-3">
                  <span className="font-[family-name:var(--font-mono)] text-[11px] font-bold" style={{ color: "var(--ink-faint)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[15px]" style={{ color: "var(--ink-light)" }}>{item}</span>
                </div>
              )}
            </div>

            <Callout type="warn" label="Important">
              This guide is for general information purposes only and is not a substitute for professional tax advice. Since it may vary depending on your individual situation, we recommend consulting a tax accountant (CPA) in complex cases.
            </Callout>
          </> :
          visa && !isResident ?
          <>
            <Callout type="tip" label={`${visa.label} ${visa.labelKo}`}>
              {visa.desc}
            </Callout>

            <Callout type="info" label="Key Concept">
              <strong>“Tax Return” ≠ “Refund”</strong>
              <br /><br />
              Filing a tax return means <strong>reporting last year&apos;s income to the IRS</strong>, and eligible taxpayers must file.
              A refund is separate: you receive money back only if your withholding exceeded your final tax due.
              <strong>You may also owe additional tax</strong> after filing.
            </Callout>

            {/* Key numbers */}
            <div
              className="grid grid-cols-3 gap-px my-10 overflow-hidden"
              style={{ background: "var(--rule)", borderRadius: 2 }}>
              
              {[
              { label: "Tax year", value: "2025", sub: "Income earned in 2025" },
              { label: "Deadline", value: "4.15", sub: "Wednesday, April 15, 2026" },
              { label: "Estimated cost", value: visaType === "h1b" || visaType === "l1" ? "$0–50" : "$0–35", sub: "Software fee" }].
              map((item) =>
              <div
                key={item.label}
                className="text-center py-5 px-3"
                style={{ background: "var(--paper)" }}>
                
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
              )}
            </div>

            <Callout type="warn" label="Arriving in 2026?">
              <strong>If you first arrived in the U.S. in 2026, you generally do not file in spring 2026.</strong>
              <br />
              You will file income earned in 2026 during <strong>spring 2027</strong>.
              Spring 2026 filing is for <strong>2025 income</strong>.
            </Callout>

            <SectionLabel>Filing Deadlines</SectionLabel>
            <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
              {[
              {
                case_: "If you have salary income (W-2)",
                date: "April 15, 2026",
                note: "Due 4/15 if you have wages withheld"
              },
              {
                case_: "If you have income in the US but no wages withholding tax",
                date: "June 15, 2026",
                note: "Automatic 2-month extension (no separate application required)"
              },
              {
                case_: "Submit Form 8843 without income",
                date: "June 15, 2026",
                note: "8843 is an information reporting form and is due 6/15"
              }].
              map((item) =>
              <div
                key={item.case_}
                className="flex flex-col gap-1 py-3.5"
                style={{ borderBottom: "1px solid var(--rule-light)" }}>
                
                  <p className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                    {item.case_}
                  </p>
                  <div className="flex items-center gap-3">
                    <span
                    className="font-[family-name:var(--font-mono)] text-[13px] font-bold"
                    style={{ color: "var(--accent)" }}>
                    
                      {item.date}
                    </span>
                    <span className="text-[12px]" style={{ color: "var(--ink-faint)" }}>
                      {item.note}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3 cases — customized per visa */}
            <SectionLabel>report case</SectionLabel>
            <Prose>
              <p className="mb-4">The form you submit will vary depending on your situation:</p>
            </Prose>
            <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
              {visaType === "h1b" || visaType === "l1" ?
              <>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--accent)" }}>Case 1</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip={`Resident Alien — An alien who is a resident alien for U.S. tax purposes. ${visa.label}There is no SPT exemption, so if you stay for more than 183 days, it is RA.`}>RA</T> (most {visa.label})
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <T tip="Standard income tax return form used by U.S. citizens and RAs."><Code>Form 1040</Code></T> Submit — TurboTax, H&R Block, and more available
                    </p>
                  </div>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--ink-muted)" }}>Case 2</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip={`Non-Resident Alien — A non-resident alien for U.S. tax purposes. ${visa.label} This applies if you stay less than 183 days in the first year.`}>NRA</T> (First year partial year)
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <T tip="IRS form used by NRAs to report U.S. income."><Code>Form 1040-NR</Code></T> submit, or{" "}
                      <T tip={`First-Year Choice — ${visa.label} If you stay for only part of the first year, you can choose to be treated as an RA from the date of arrival.`}>First-Year Choice Election</T>1040 available as
                    </p>
                  </div>
                </> :
              visaType === "dependent" || visaType === "l2" ?
              <>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--accent)" }}>Case 1</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip="Non-Resident Alien — A non-resident alien for U.S. tax purposes.">NRA</T> + no income
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <T tip="Information reporting form submitted by all NRAs in the United States."><Code>Form 8843</Code></T>Submit only - accompanying visa must also be submitted individually
                    </p>
                  </div>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--ink-muted)" }}>Case 2</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip="Non-Resident Alien — A non-resident alien for U.S. tax purposes.">NRA</T> + Working as an EAD
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <Code>Form 1040-NR</Code> + <Code>Form 8843</Code> submit together
                    </p>
                  </div>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--ink-muted)" }}>Case 3</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip="Resident Alien — An alien who is a resident alien for U.S. tax purposes.">RA</T> (Same status as primary visa holder)
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <Code>Form 1040</Code> Submit (can use TurboTax, etc.)
                    </p>
                  </div>
                </> : (

              /* F-1, J-1 Researcher, J-1 Student */
              <>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--accent)" }}>Case 1</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip={`Non-Resident Alien — A non-resident alien for U.S. tax purposes. ${visa.label}is the first time ${visa.sptExemptYears} NRA during the calendar year.`}>NRA</T> + no income
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <T tip="Information reporting form submitted by all NRAs in the United States. It is essential even if you have no income.">
                        <Code>Form 8843</Code>
                      </T>
                      Submit only (<T tip="Social Security Number — U.S. Social Security Number (9 digits).">SSN</T>/<T tip="Individual Taxpayer Identification Number — A taxpayer identification number used in place of an SSN. Apply with Form W-7.">ITIN</T> (Can be done without)
                    </p>
                  </div>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--accent)" }}>Case 2</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip="Non-Resident Alien — A non-resident alien for U.S. tax purposes.">NRA</T> + Has US income
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <T tip="IRS form used by NRAs to report U.S. income."><Code>Form 1040-NR</Code></T>{" "}+{" "}
                      <T tip="NRA Required Information Reporting Form. Submit with 1040-NR."><Code>Form 8843</Code></T> submit together
                    </p>
                  </div>
                  <div className="py-4" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold" style={{ color: "var(--ink-muted)" }}>Case 3</span>
                      <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                        <T tip="Resident Alien — An alien who is a resident alien for U.S. tax purposes. When the SPT exemption period ends, it will be converted to RA.">RA</T> (Resident conversion)
                      </span>
                    </div>
                    <p className="text-[13px] ml-[60px]" style={{ color: "var(--ink-muted)" }}>
                      <T tip="Standard income tax return form used by U.S. citizens and RAs."><Code>Form 1040</Code></T> submit (<T tip="The most widely used tax reporting software in the United States. Only RA is available.">TurboTax</T> etc. available)
                    </p>
                  </div>
                </>)
              }
            </div>

            <SectionLabel>What's covered in this guide</SectionLabel>
            <div className="space-y-3">
              {[
              "Determination of resident status for tax purposes (NRA/RA)",
              "Income tax exemption benefits under the Korea-U.S. tax treaty",
              "Required Document Checklist",
              "How to report federal taxes",
              "How to report state tax",
              "Document submission and refund (refund) tracking"].
              map((item, i) =>
              <div key={i} className="flex items-baseline gap-3">
                  <span className="font-[family-name:var(--font-mono)] text-[11px] font-bold" style={{ color: "var(--ink-faint)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[15px]" style={{ color: "var(--ink-light)" }}>{item}</span>
                </div>
              )}
            </div>

            <SectionLabel>Select year of arrival</SectionLabel>
            <Prose>
              <p className="mb-3">
                {visaType === "h1b" || visaType === "l1" ?
                "Used for RA/NRA determinations and tax guide calculations." :
                "Used in calculating tax treaty exemption periods."}
              </p>
            </Prose>
            <div className="flex items-center gap-4">
              <select
                value={arrivalYear}
                onChange={(e) => {
                  const y = window.scrollY;
                  setArrivalYear(e.target.value);
                  requestAnimationFrame(() => window.scrollTo(0, y));
                }}
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
                  backgroundPosition: "right 10px center"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                onBlur={(e) => e.target.style.borderColor = "var(--rule)"}>
                
                <option value="">Please select</option>
                {Array.from({ length: 12 }, (_, i) => 2026 - i).map((y) =>
                <option key={y} value={String(y)}>
                    {y}year
                  </option>
                )}
              </select>
              {isValidYear &&
              <span className="text-sm" style={{ color: "var(--moss)" }}>
                  {arrivalNum}Guided by year
                </span>
              }
            </div>

            <Callout type="warn" label="caution">
              This guide is for general information purposes only and is not a substitute for professional tax advice. As it may vary depending on individual circumstances, we recommend consulting a tax accountant in complex cases.
            </Callout>
          </> :
          null}
        </div>
      </>);

  }

  /* ==============================================================
     STEP 1 — 거주자 상태 확인
     ============================================================== */

  function Step1() {
    if (!visa) return <VisaPrompt />;

    const isResident = visaType === "green-card" || visaType === "citizen";
    const exemptYears = visa.sptExemptYears;
    const isH1B = visaType === "h1b";
    const isL1 = visaType === "l1";
    const isL2 = visaType === "l2";
    const isH1BLike = isH1B || isL1;
    const isDependent = visaType === "dependent";
    const isDependentLike = isDependent || isL2;
    const isStudent = visaType === "f1-student" || visaType === "j1-student";

    if (isResident) {
      return (
        <>
          <h1
            className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
            style={{ color: "var(--ink)" }}>
            
            Check resident status
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
            {visaType === "citizen" ? "citizen" : "permanent resident"}is always a resident under tax law.
          </p>

          <Callout type="tip" label="Always a resident">
            {visaType === "citizen" ?
            "U.S. citizens are always residents for tax purposes. No NRA/RA judgment (Substantial Presence Test) required." :
            <>Green Card holders are always residents under tax law. <T tip="Green Card Test — A test that automatically classifies you as a tax resident (RA) if you have a green card, regardless of the number of days you stayed.">Green Card Test</T>You are classified as RA from the first year of obtaining permanent residency.</>}
          </Callout>

          <Prose>
            <p>
              Visa holders (F-1, J-1, H-1B, etc.) require NRA/RA determination depending on the number of days of stay.
              {visaType === "citizen" ? " citizen" : " permanent resident"}Is <strong>Always a resident</strong>as{" "}
              <Code>Form 1040</Code>Use .
            </p>
          </Prose>

          <SectionLabel>Filing Status (Filing Type)</SectionLabel>
          <Prose>
            <p className="mb-4">
              When filling out Form 1040, <T tip="Filing Status — The filing status you select when filing your taxes. There are single (unmarried), MFJ (married jointly), MFS (married separately), HoH (head of household), etc., and the tax rate and deduction amount vary accordingly.">Filing Status</T>You must select . Tax rate and <T tip="Standard Deduction — A standard deduction automatically deducted from your income. You can deduct a certain amount without any additional proof. $15,700 for single in 2025.">Standard Deduction</T>This varies:
            </p>
          </Prose>
          <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
            {[
            { status: "Single", desc: "Unmarried or separated/divorced as of December 31" },
            { status: "Married Filing Jointly (MFJ)", desc: "Filing jointly with your spouse — best for most couples" },
            { status: "Married Filing Separately (MFS)", desc: "Filing separately from your spouse – advantageous only in special cases" },
            { status: "Head of Household (HoH)", desc: "Single, has dependents, and covers more than 50% of household expenses" },
            { status: "Qualifying Surviving Spouse (QSS)", desc: "Within 2 years of spouse's death, if there are dependent children" }].
            map((item) =>
            <div
              key={item.status}
              className="flex flex-col gap-1 py-3.5"
              style={{ borderBottom: "1px solid var(--rule-light)" }}>
              
                <p className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
                  {item.status}
                </p>
                <p className="text-[12.5px]" style={{ color: "var(--ink-muted)" }}>
                  {item.desc}
                </p>
              </div>
            )}
          </div>

          <SectionLabel>Standard Deduction (tax year 2025)</SectionLabel>
          <div
            className="grid grid-cols-1 gap-px my-4 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}>
            
            {[
            { status: "Single", amount: "$15,700" },
            { status: "MFJ / QSS", amount: "$31,400" },
            { status: "HoH", amount: "$23,500" },
            { status: "MFS", amount: "$15,700" }].
            map((item) =>
            <div key={item.status} className="flex items-center justify-between p-4" style={{ background: "var(--paper)" }}>
                <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>{item.status}</span>
                <span className="font-[family-name:var(--font-mono)] text-[15px] font-bold" style={{ color: "var(--accent)" }}>{item.amount}</span>
              </div>
            )}
          </div>

          <Callout type="info" label="MFJ is generally advantageous">
            If both spouses are residents <strong><T tip="Married Filing Jointly — A method for married couples to combine their income and file a joint return. The tax brackets are wide and the standard deduction is large, making it advantageous for most couples.">MFJ</T></strong>is generally the most advantageous. Standard Deduction is the largest, and the tax rate range is wide, so taxes are reduced.
            
            <br /><br />
            However, the spouse <T tip="Non-Resident Alien — A non-resident alien for U.S. tax purposes.">NRA</T>In this case, if you choose MFJ, your spouse will also <T tip="Worldwide Income — All income earned worldwide, not just in the United States. Residents and citizens must report their worldwide income to the United States.">worldwide income</T>must be reported.
          </Callout>
        </>);

    }

    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}>
          
          Verify residency status for tax purposes
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          <T tip="Non-Resident Alien. A non-resident alien under U.S. tax law.">NRA</T> vs{" "}
          <T tip="Resident Aliens. Refers to an alien resident under U.S. tax law.">RA</T> — The first step is deciding which form to use.
        </p>

        <Prose>
          <p>
            In U.S. tax law, “resident” and “non-resident” are defined in immigration law.{" "}
            <strong>different</strong>. The form you use will depend on your residency status for tax purposes.
          </p>
        </Prose>

        {/* NRA vs RA comparison */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-px my-8 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}>
          
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p
              className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-4"
              style={{ color: "var(--accent)" }}>
              
              NRA (non-resident)
            </p>
            <ul className="space-y-2.5 text-[14px]" style={{ color: "var(--ink-light)" }}>
              <li>
                <T tip="IRS form used by NRAs to report U.S. income.">
                  <Code>Form 1040-NR</Code>
                </T>{" "}use
              </li>
              <li>
                <T tip="Information reporting form submitted by all NRAs in the United States. It is essential even if you have no income.">
                  <Code>Form 8843</Code>
                </T>{" "}required submission
              </li>
              <li>
                {visa.ficaExempt ?
                <><T tip="Federal Insurance Contributions Act. A combination of Social Security tax (6.2%) and Medicare tax (Medicare 1.45%).">FICA</T> exemption</> :
                <><T tip="Federal Insurance Contributions Act. A combination of Social Security tax (6.2%) and Medicare tax (Medicare 1.45%).">FICA</T> Payment target</>
                }
              </li>
              <li>
                <T tip="NRA-specific tax reporting software. Schools often provide free codes.">Sprintax / GLACIER Tax Prep</T>
              </li>
            </ul>
          </div>
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p
              className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-4"
              style={{ color: "var(--ink-muted)" }}>
              
              RA (Resident)
            </p>
            <ul className="space-y-2.5 text-[14px]" style={{ color: "var(--ink-muted)" }}>
              <li>
                <T tip="Standard income tax return form used by U.S. citizens and resident aliens (RAs).">
                  <Code>Form 1040</Code>
                </T>{" "}use
              </li>
              <li>
                <T tip="The most used tax reporting software in the United States. Available only to RAs (resident aliens).">TurboTax, H&R Block</T> available
              </li>
              <li>
                <T tip="Federal Insurance Contributions Act. RAs must pay Social Security (6.2%) and Medicare (1.45%).">FICA</T> Payment target
              </li>
              <li>Same procedure as for ordinary citizens</li>
            </ul>
          </div>
        </div>

        <SectionLabel>Substantial Presence Test (SPT)</SectionLabel>
        <Prose>
          <p>
            The IRS{" "}
            <T tip="A test to determine tax residency based on the number of days you are physically present in the United States.">
              Substantial Presence Test (SPT)
            </T>
            to determine whether you are a resident for tax purposes. The two conditions below <strong>every</strong> If it meets:
          </p>
        </Prose>
        <div
          className="my-6 p-5"
          style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 2 }}>
          
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>
            SPT formula
          </p>
          <ol className="space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
            <li>1. In the United States in the relevant tax year <strong>31 days or more</strong> visit</li>
            <li className="mt-2">2. Weight summation <strong>183 days or more</strong>:</li>
          </ol>
          <div
            className="mt-3 p-4 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed"
            style={{ background: "var(--cream)", borderRadius: 2, color: "var(--ink)" }}>
            
            Date of stay in the year × <strong>1</strong>
            <br />
            + Date of stay in previous year × <strong>1/3</strong>
            <br />
            + Date of stay in previous year × <strong>1/6</strong>
            <br />
            = <span style={{ color: "var(--accent)" }}>RA for more than 183 days</span>
          </div>
        </div>

        {/* SPT exemption section — varies by visa */}
        {isH1BLike ?
        <>
            <SectionLabel>{visa.label}and SPT</SectionLabel>
            <Callout type="warn" label={`${visa.label}There is no SPT exemption`}>
              {visa.label} Visa holders are not exempt from SPT for any period of time.
              <br /><br />
              thus <strong>RA if you stay for more than 183 days from the first year</strong>no see. most {visa.label} Since the holder stays all year round, <strong>Classified as RA</strong>It works.
            </Callout>
            {isL1 &&
          <Callout type="info" label="L-1 Example: Arrived 4/30">
                Arrived on April 30 → Stay for the year approximately 245 days → <strong>Immediate RA beyond 183 days</strong>
                <br /><br />
                Residency Start Date = Arrival date in the United States <strong>April 30th</strong>This happens.
                <br />
                Unlike F/J, L-1 <T tip="Substantial Presence Test — 183-day residency test. There is no exemption period for the L visa, so all days of stay are counted.">SPT</T> There are no exemptions, so you quickly become an RA starting within the first year of your arrival.
              </Callout>
          }
            <Prose>
              <p>
                {visa.label} If your stay is less than 183 days in the middle of the first year, that year is classified as NRA. In this case you have two choices:
              </p>
            </Prose>
            <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-px my-6 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}>
            
              <div className="p-5" style={{ background: "var(--paper)" }}>
                <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
                  Option A — <T tip="Dual-Status — When the status is partly divided into NRA and partly RA within the same tax year. Tax laws appropriate for each period are applied separately.">Dual Status</T>
                </p>
                <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                  Divide the year into NRA period + RA period and report each
                </p>
                <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-faint)" }}>
                  A complicated but accurate method
                </p>
              </div>
              <div className="p-5" style={{ background: "var(--paper)" }}>
                <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--moss)" }}>
                  Option B — <T tip={`First-Year Choice Election — ${visa.label} If you stay for only part of the first year, you can choose to be treated as an RA (resident) from the date of arrival.`}>First-Year Choice</T>
                </p>
                <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                  Choose to be treated as RA from the date of arrival (spouse can report jointly)
                </p>
                <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-faint)" }}>
                  <T tip="Standard Deduction — A standard deduction automatically deducted from your income. Only RA is applicable.">Standard Deduction</T> available
                </p>
              </div>
            </div>
            {isL1 &&
          <Callout type="warn" label="Korea-US Social Security Agreement (Totalization Agreement)">
                At our headquarters in Korea <strong>Dispatched L-1 expatriate</strong>According to the Korea-U.S. Social Security Agreement, the U.S. <T tip="FICA — Social Security (6.2%) + Medicare (1.45%) taxes. Taxes are automatically withheld from your paycheck.">FICA</T> Payment may be waived.
                <br /><br />
                &bull; <strong>Dispatched (maintained at headquarters)</strong>: From the National Pension Service <strong>Certificate of Coverage</strong>Receive and submit to US employer → FICA exemption
                <br />
                &bull; <strong>Local recruitment (US corporate salary)</strong>: Because it is not subject to the Social Security Agreement <strong>FICA payment obligations</strong>
                <br /><br />
                A certificate of application must be applied to the International Cooperation Team of the National Pension Service before or at the beginning of dispatch.
              </Callout>
          }
          </> :
        isDependentLike ?
        <>
            <SectionLabel>{isL2 ? "L-2 companion visa" : "accompanying visa"}and resident status</SectionLabel>
            <Callout type="info" label="Depends on the status of the primary visa holder">
              {isL2 ? "L-2" : "Companion visa (J-2, F-2, H-4)"} The holder's NRA/RA status is <strong>Depends on the status of the primary visa holder</strong>.
              <br /><br />
              • Primary visa holder is NRA → Companion visa holder is also NRA
              <br />
              • Primary visa holder is RA → Companion visa holder is also RA
            </Callout>
            {isL2 &&
          <>
                <Callout type="warn" label="L-2 has no SPT exemption">
                  Unlike F-2/J-2 <strong>L-2 has no SPT exemption period</strong>. All stay days are included in SPT calculations.
                  <br /><br />
                  If you arrive with your L-1 spouse, you will become an RA if you stay for more than 183 days.
                </Callout>
                <Callout type="tip" label="MFJ Election">
                  If the L-1 spouse is an RA, the L-2 spouse is also <T tip="Married Filing Jointly — Married filing jointly. Standard Deduction is double and the tax rate range is also advantageous."><strong>MFJ (Married Filing Jointly)</strong></T>You can select .
                  <br /><br />
                  If you choose MFJ, you can significantly reduce your tax burden by applying the Standard Deduction of $31,400 (as of 2025).
                </Callout>
              </>
          }
          </> :

        <>
            <SectionLabel>{visa.label} SPT exemption period</SectionLabel>
            <Prose>
              <p>
                {visa.label} Holders are exempt from SPT for a certain period of time:
              </p>
            </Prose>
            <div
            className="my-6 p-5"
            style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 2 }}>
            
              <p
              className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3"
              style={{ color: "var(--accent)" }}>
              
                {visa.label}
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                SPT exemption: <strong>{exemptYears} Calendar Years</strong> (years {exemptYears}year)
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-faint)" }}>
                {isStudent ?
              "Longer exemption periods apply for student status" :
              "Including Research Scholar, Professor, Short-term Scholar"}
              </p>
            </div>

            <Callout type="warn" label="Calendar Year Caution">
              <T tip="Calendar Year = A calendar year (January 1 to December 31). The IRS counts it as one year if you were in the United States even for one day during the year.">
                Calendar Year
              </T>
              What is it? The IRS will <strong>just one day</strong>Even if you were in the US, it counts as one year.
              <br /><br />
              Example: Arrives on December 31, 2024 → 2024 is the first calendar year
            </Callout>
          </>
        }

        {isValidYear && !isH1BLike && !isDependentLike && exemptYears > 0 &&
        <Callout type="info" label={`my condition (${visa.label} standard)`}>
            <strong>{arrivalNum}year</strong> Arrival criteria:
            <br />
            &bull; {arrivalNum}~{arrivalNum + exemptYears - 1}year:{" "}
            <T tip="Non-Resident Alien — A non-resident alien for U.S. tax purposes.">
              <strong style={{ color: "var(--accent)" }}>NRA</strong>
            </T>
            {" "}&rarr;{" "}
            <T tip="Form 1040-NR — IRS form used by non-resident aliens (NRAs) to report U.S. income.">
              Form 1040-NR
            </T>
            {" "}+{" "}
            <T tip="Form 8843 — Information reporting form required by all NRAs in the United States.">
              Form 8843
            </T>
            {arrivalNum + exemptYears <= 2026 &&
          <>
                <br />
                &bull; {arrivalNum + exemptYears}Year~:{" "}
                <T tip="Resident Alien — An alien who is a resident alien for U.S. tax purposes. After the SPT exemption period ends, it will be converted to RA.">
                  <strong>Can be converted to RA</strong>
                </T>
                {" "}&rarr;{" "}
                <T tip="Form 1040 — Standard income tax return form used by U.S. citizens and resident aliens (RAs).">
                  Form 1040
                </T>
              </>
          }
          </Callout>
        }

        {isValidYear && isH1BLike &&
        <Callout type="info" label={`my condition (${visa.label} standard)`}>
            <strong>{arrivalNum}year</strong> Arrival criteria:
            <br />
            &bull; {arrivalNum}If you stayed more than 183 days in a year:{" "}
            <strong style={{ color: "var(--accent)" }}>RA</strong> &rarr; Form 1040
            <br />
            &bull; {arrivalNum}If you stayed less than 183 days in a year:{" "}
            <strong style={{ color: "var(--accent)" }}>NRA</strong> → Form 1040-NR (or First-Year Choice)
            {arrivalNum < 2025 &&
          <>
                <br />
                &bull; {arrivalNum + 1}After year: For year-round stays <strong>RA</strong>
              </>
          }
          </Callout>
        }

        <Callout type="tip" label="importance">
          {isH1BLike ?
          <>
              <T tip="Resident Alien — An alien who is a resident alien for U.S. tax purposes.">RA</T>When it comes{" "}
              <T tip="TurboTax — America's most popular tax preparation software."><strong>TurboTax</strong></T>me{" "}
              <T tip="H&R Block — America's leading tax preparation service/software."><strong>H&R Block</strong></T>You can use .
              {visa.label} Only if you are NRA in the first year{" "}
              <T tip="Sprintax — Online tax filing tool exclusively for non-resident aliens (NRAs)."><strong>Sprintax</strong></T>Please use .
            </> :

          <>
              <T tip="Non-Resident Alien — A non-resident alien for U.S. tax purposes.">NRA</T>
              Is{" "}
              <T tip="TurboTax — America's most popular tax preparation software. The NRA cannot use it."><strong>TurboTax</strong></T>
              me{" "}
              <T tip="H&R Block — America's leading tax preparation service/software. NRA is not allowed."><strong>H&R Block</strong></T>
              is not available. The NRA must{" "}
              <T tip="Sprintax — NRA’s exclusive online tax filing tool."><strong>Sprintax</strong></T>
              {" "}or{" "}
              <T tip="GLACIER Tax Prep — A federal tax-specific preparation tool provided by universities to NRAs."><strong>GLACIER Tax Prep</strong></T>
              Please use .
            </>
          }
        </Callout>
      </>);

  }

  /* ==============================================================
     STEP 2 — 한미 조세조약
     ============================================================== */

  function Step2() {
    if (!visa) return <VisaPrompt />;

    const isResident = visaType === "green-card" || visaType === "citizen";
    const isH1B = visaType === "h1b";
    const isL1 = visaType === "l1";
    const isL2 = visaType === "l2";
    const isH1BLike = isH1B || isL1;
    const isDependent = visaType === "dependent";
    const isDependentLike = isDependent || isL2;
    const isJ1Researcher = visaType === "j1-researcher";
    const isStudent = visaType === "f1-student" || visaType === "j1-student";

    if (isResident) {
      return (
        <>
          <h1
            className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
            style={{ color: "var(--ink)" }}>
            
            Avoiding Double Taxation — FTC & FEIE
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
            How to avoid paying taxes in Korea again in the US
          </p>

          <SectionLabel>Saving Clause</SectionLabel>
          <Prose>
            <p>
              In the Korea-U.S. tax treaty, <strong><T tip="Saving Clause — A provision included in a tax treaty that allows the United States to tax its citizens and permanent residents according to its own tax laws regardless of the treaty.">Saving Clause</T></strong>Therefore, most tax treaty exemption benefits do not apply to U.S. citizens and permanent residents. Instead, to prevent double taxation 
              <strong><T tip="Foreign Tax Credit — A system in which taxes paid abroad are deducted from U.S. taxes. Apply with Form 1116.">FTC</T>(Foreign tax credit)</strong>and <strong><T tip="Foreign Earned Income Exclusion — A system that excludes earned income earned abroad from U.S. taxable income. Up to $130,000 in 2025. Apply with Form 2555.">FEIE</T>(Overseas earned income deduction)</strong> Take advantage of the system.
            </p>
          </Prose>

          <Callout type="warn" label="Saving Clause">
            Article 4(2) of the Korea-US Tax Treaty: The United States may tax U.S. citizens and permanent residents according to its own tax laws. In other words, the tax exemption benefits that visa holders receive (Articles 20, 21, etc.) 
            <strong>Does not apply to permanent residents or citizens</strong>.
          </Callout>

          <SectionLabel>FTC — Foreign Tax Credit (Form 1116)</SectionLabel>
          <div
            className="my-6 p-5"
            style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 2 }}>
            
            <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
              Foreign tax credit
            </p>
            <p className="text-[14px] mb-3" style={{ color: "var(--ink-light)" }}>
              Taxes already paid in Korea are deducted from U.S. taxes. <strong>credit</strong>It is a receiving system.
            </p>
            <ul className="space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                Income tax paid in Korea is deducted 1:1 from U.S. taxes
              </li>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                Deduction limit: Up to the amount of U.S. taxes on eligible income.
              </li>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                Proof of tax paid in Korea is required (Hometax tax payment certificate)
              </li>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                Unused credits can be carried over for up to 10 years
              </li>
            </ul>
          </div>

          <SectionLabel>FEIE — Foreign Earned Income Exclusion (Form 2555)</SectionLabel>
          <div
            className="my-6 p-5"
            style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 2 }}>
            
            <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--moss)" }}>
              Overseas earned income deduction
            </p>
            <p className="text-[14px] mb-3" style={{ color: "var(--ink-light)" }}>
              Earned income earned abroad is deducted from U.S. taxable income. <strong>exclusion</strong>It is a system that does this.
            </p>
            <ul className="space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                Maximum deduction for tax year 2025: <strong>$130,000</strong>
              </li>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                Eligibility: Overseas <T tip="Tax Home — The place where your principal place of business or place of work is located. To receive a FEIE, your Tax Home must be located outside the United States.">Tax Home</T>There must be
              </li>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                <T tip="Bona Fide Residence Test — A test to prove that you have lived abroad as a ‘bona fide resident’ for at least one tax year.">Bona Fide Residence Test</T> or <T tip="Physical Presence Test — A test that determines whether you have been physically present abroad for more than 330 days in 12 consecutive months.">Physical Presence Test</T> needs to be met
              </li>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                Applies only to earned income (excluding investment income, interest, and dividends)
              </li>
            </ul>
          </div>

          <SectionLabel>FTC vs FEIE Comparison</SectionLabel>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-px my-4 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}>
            
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
                FTC (Form 1116)
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>• Deduct Korean taxes from U.S. taxes</li>
                <li>• Applicable to all income types</li>
                <li>• Unused portion can be carried over (10 years)</li>
                <li>&bull; <strong>In most cases, the FTC is better</strong></li>
              </ul>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--moss)" }}>
                FEIE (Form 2555)
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>• Excluding overseas earned income from taxation</li>
                <li>• Applicable only to earned income (excluding investment income)</li>
                <li>• Requires meeting overseas residency requirements</li>
                <li>• May be advantageous if you pay less taxes in Korea</li>
              </ul>
            </div>
          </div>

          <Callout type="warn" label="FTC and FEIE cannot be applied simultaneously to the same income.">
            You cannot apply FTC and FEIE at the same time for the same income. You cannot claim FTC on income excluded by FEIE, and vice versa.
            
            <br /><br />
            Generally, if you live in the U.S. and have Korean income <strong>FTC is better</strong>do.
          </Callout>

          <SectionLabel>Korean withholding tax ceiling (tax treaty)</SectionLabel>
          <div
            className="grid grid-cols-3 gap-px my-4 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}>
            
            {[
            { type: "allocation", rate: "15%", note: "Dividends" },
            { type: "interest", rate: "12%", note: "Interest" },
            { type: "royalty", rate: "15%", note: "Royalties" }].
            map((item) =>
            <div key={item.type} className="text-center py-4 px-3" style={{ background: "var(--paper)" }}>
                <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>
                  {item.type}
                </p>
                <p className="font-[family-name:var(--font-serif)] text-[24px] font-black leading-none" style={{ color: "var(--accent)" }}>
                  {item.rate}
                </p>
                <p className="text-[11px] mt-1" style={{ color: "var(--ink-faint)" }}>
                  {item.note}
                </p>
              </div>
            )}
          </div>
          <Prose>
            <p>
              In accordance with the Korea-US Tax Treaty, the tax withholding rate in Korea is limited as above. Taxes withheld in Korea can be deducted from your U.S. taxes by the FTC.
            
            </p>
          </Prose>

          <Callout type="info" label="Form 8833">
            If you claim a position based on a tax treaty (e.g. Saving Clause exception applies);{" "}
            <Code>Form 8833</Code>must be submitted with your tax return.
          </Callout>
        </>);

    }

    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}>
          
          Korea-US Tax Treaty Benefits
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          {isDependentLike ?
          `${isL2 ? "L-2 " : ""}Tax treaty application for companion visas` :
          isL1 ?
          "Tax treaties and FICA for L-1 expatriates" :
          <>
                  <T tip={`Korea-US Tax Treaty ${visa.treatyArticle} — This is a tax exemption provision that applies to visa holders from Korea.`}>
                    {visa.treatyArticle}
                  </T>{" "}— The key to income tax exemption
                </>
          }
        </p>

        {isDependentLike ?
        <>
            <Prose>
              <p>
                {isL2 ? "L-2" : "Companion visa (J-2, F-2, H-4)"} Separate tax treaty benefits do not directly apply to the holder. The tax exemption provisions of the tax treaty apply to primary visa holders (
              {isL2 ? "L-1" : "J-1, F-1"} etc.) applies.
              </p>
            </Prose>
            <Callout type="info" label={`${isL2 ? "L-2" : "accompanying visa"} income tax`}>
              {isL2 ? "L-2 EAD" : "J-2 or H-4 EAD"}If you are employed and have income, <strong>General Tax Filing Obligations</strong>There is.
              <br /><br />
              If you are an NRA, file Form 1040-NR + Form 8843, if you are an RA, file Form 1040.
            </Callout>
            {isL2 &&
          <Callout type="info" label="FICA for L-2 EAD employment">
                If you are employed with an L-2 EAD, the L-1 primary visa holder is an RA, so the L-2 is also usually an RA. <strong>FICA payment eligibility</strong>no see.
                <br /><br />
                Same as regular workers, 6.2% Social Security + 1.45% Medicare is withheld from W-2.
              </Callout>
          }
            <Callout type="warn" label="Form 8843">
              Even if you have no income, you can apply for a companion visa as an NRA. <strong>Form 8843 must be submitted individually</strong>You have to do it. Submit one page separately for your spouse and children.
            
          </Callout>
          </> :
        isH1BLike ?
        <>
            {isL1 ?
          <>
                <Prose>
                  <p>
                    There are no general tax treaty exemptions for L-1 holders. Unlike H-1B, the professor/researcher provision (Article 20) does not apply.
                  </p>
                </Prose>

                <div
              className="my-8 py-8 px-6 text-center"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                borderRadius: 2
              }}>
              
                  <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "var(--ink-faint)" }}>
                    Tax treaty benefits
                  </p>
                  <p className="font-[family-name:var(--font-serif)] text-[clamp(18px,3vw,28px)] font-black leading-tight">
                    No general tax exemptions
                  </p>
                  <p className="text-[13px] mt-3" style={{ color: "var(--ink-faint)" }}>
                    There is no separate tax treaty exemption provision applicable to L-1 expatriate/dispatched employees.
                  </p>
                </div>

                <Callout type="info" label="L-1 RA — Standard Deduction">
                  If you are an RA as an L-1, the same as a U.S. citizen. <strong><T tip="Standard Deduction — A standard deduction automatically subtracted from taxable income. Applies without separate proof.">Standard Deduction</T>($15,700, single as of 2025)</strong>applies.
                  <br /><br />
                  Also, R.A. <strong><T tip="Worldwide Income — All income earned worldwide, not just in the United States. This includes all Korean wages, interest, dividends, rental income, etc.">Worldwide Income</T></strong>is taxed. If you have Korean income, you must report it together. step, 
              <T tip="Foreign Tax Credit — A system in which taxes paid abroad are deducted from U.S. taxes. Prevent double taxation.">Foreign Tax Credit</T>This can prevent double taxation.
                </Callout>

                <SectionLabel>FICA and Korea-US Social Security Agreement</SectionLabel>
                <Callout type="warn" label="L-1 FICA Payment Obligations">
                  In principle, L-1 holders are <strong><T tip="Federal Insurance Contributions Act — A tax that combines Social Security (6.2%) and Medicare (1.45%).">FICA</T>Pay (Social Security 6.2% + Medicare 1.45%)</strong>You have to do it.
                </Callout>
                <Callout type="tip" label="Totalization Agreement (Social Security Agreement)">
                  step, <strong>Expatriate dispatched from headquarters in Korea</strong>may be exempt from FICA under the Korea-U.S. Social Security Agreement.
                  <br /><br />
                  <strong>Dispatch (maintained on headquarters salary, within 5 years):</strong>
                  <br />
                  • At the National Pension Service <strong>Certificate of Coverage</strong> issued
                  <br />
                  • Submitted to U.S. employer → exempt from FICA withholding tax
                  <br />
                  • Pay only Korean national pension (prevent double payment)
                  <br /><br />
                  <strong>Local hiring (direct hiring from US corporations):</strong>
                  <br />
                  • Subject to the Social Security Agreement <strong>Not</strong>
                  <br />
                  • U.S. FICA normal payment obligations
                  <br /><br />
                  Certificate of application must be submitted before dispatch or at the beginning of dispatch. <strong>National Pension Service International Cooperation Team</strong>Apply to.
                </Callout>
              </> :

          <>
                <Prose>
                  <p>
                    Tax treaty benefits for H-1B holders are limited. Only if you work as a professor or researcher at a university or research institute{" "}
                    <T tip="Korea-US Tax Treaty Article 20(1) — Tax exemption provisions for teaching/research income.">Article 20(1)</T>can be applied.
                  </p>
                </Prose>

                <div
              className="my-8 py-8 px-6 text-center"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                borderRadius: 2
              }}>
              
                  <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "var(--ink-faint)" }}>
                    Tax treaty benefits
                  </p>
                  <p className="font-[family-name:var(--font-serif)] text-[clamp(18px,3vw,28px)] font-black leading-tight">
                    Only for university professors/researchers
                  </p>
                  <p className="font-[family-name:var(--font-serif)] text-[clamp(18px,3vw,28px)] font-black leading-tight" style={{ color: "var(--accent-soft)" }}>
                    Article 20(1) applicable
                  </p>
                  <p className="text-[13px] mt-3" style={{ color: "var(--ink-faint)" }}>
                    No tax treaty benefits when working for a general company
                  </p>
                </div>

                <Callout type="info" label="H-1B RA — Standard Deduction">
                  If you are an RA with H-1B, the same as a U.S. citizen <strong><T tip="Standard Deduction — A standard deduction automatically subtracted from taxable income. Applies without separate proof.">Standard Deduction</T>($14,600, single as of 2024)</strong>applies.
                  <br /><br />
                  Also, R.A. <strong><T tip="Worldwide Income — All income earned worldwide, not just in the United States. This includes all Korean wages, interest, dividends, rental income, etc.">Worldwide Income</T></strong>is taxed. If you have Korean income, you must report it together. step, 
              <T tip="Foreign Tax Credit — A system in which taxes paid abroad are deducted from U.S. taxes. Prevent double taxation.">Foreign Tax Credit</T>This can prevent double taxation.
                </Callout>

                <SectionLabel>FICA (Social Security + Medicare)</SectionLabel>
                <Callout type="warn" label="H-1B is not FICA exempt">
                  H-1B holders are either NRA or RA. <strong><T tip="Federal Insurance Contributions Act — A tax that combines Social Security (6.2%) and Medicare (1.45%). Taxes are automatically withheld from your paycheck.">FICA</T> Pay taxes (6.2% Social Security + 1.45% Medicare)</strong>You have to do it.
                  <br /><br />
                  This is an important difference from F-1 and J-1. <T tip="W-2 — Annual salary income and tax withholding statement issued by your employer. It is issued every January to February.">W-2</T>From FICA <T tip="Withholding — Your employer deducts taxes in advance from your paycheck and pays them to the IRS.">withholding tax</T>It works.
                </Callout>
              </>
          }
          </> :

        <>
            <Prose>
              <p>
                In accordance with the tax treaty between Korea and the United States {visa.label} Holders are eligible for income tax exemption. This is a significant benefit that can save you a significant amount of money in taxes.
              
            </p>
            </Prose>

            {/* Hero stat */}
            <div
            className="my-8 py-8 px-6 text-center"
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              borderRadius: 2
            }}>
            
              <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "var(--ink-faint)" }}>
                {visa.treatyArticle}
              </p>
              {isJ1Researcher ?
            <>
                  <p className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-tight">
                    Up to 2 Calendar Years
                  </p>
                  <p className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-tight" style={{ color: "var(--accent-soft)" }}>
                    All income from teaching and research is tax exempt
                  </p>
                </> :

            <>
                  <p className="font-[family-name:var(--font-serif)] text-[clamp(20px,3.5vw,30px)] font-black leading-tight">
                    Scholarship and tuition tax exemption
                  </p>
                  <p className="font-[family-name:var(--font-serif)] text-[clamp(20px,3.5vw,30px)] font-black leading-tight" style={{ color: "var(--accent-soft)" }}>
                    + Income for living expenses: $2,000 per year
                  </p>
                </>
            }
              <p className="text-[13px] mt-3" style={{ color: "var(--ink-faint)" }}>
                Federal Income Tax + State Income Tax
              </p>
            </div>

            <SectionLabel>Tax exemption details</SectionLabel>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <span
                className="w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-bold shrink-0 mt-0.5"
                style={{ background: "var(--moss-bg)", color: "var(--moss)" }}>
                
                  O
                </span>
                <div>
                  <p className="font-medium text-sm" style={{ color: "var(--ink)" }}>exempted</p>
                  <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                    {isJ1Researcher ?
                  <>Income from teaching and research activities (<T tip="Federal Income Tax — Income tax paid to the federal government.">federal income tax</T>, <T tip="State Income Tax — Income tax paid to the state government.">state income tax</T>)</> :
                  <>Scholarship/fellowship income tax-exempt, income for living expenses up to $2,000 per year (<T tip="Federal Income Tax — Income tax paid to the federal government.">federal income tax</T>, <T tip="State Income Tax — Income tax paid to the state government.">state income tax</T>)</>
                  }
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span
                className="w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-bold shrink-0 mt-0.5"
                style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                
                  X
                </span>
                <div>
                  <p className="font-medium text-sm" style={{ color: "var(--ink)" }}>What is not exempt</p>
                  <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                    <T tip="Taxes for U.S. Social Security benefits. That's about 6.2% of your salary.">Social Security Tax</T>,{" "}
                    <T tip="Taxes for U.S. health insurance (Medicare). That's about 1.45% of your salary.">Medicare Tax</T>{" "}
                    (However, NRA {visa.label}(FICA itself is exempt)
                  </p>
                </div>
              </div>
            </div>

            {isJ1Researcher &&
          <Callout type="warn" label="“Years” What is 2 years?">
                Based on calendar year. Not a total of 24 months.
                <br /><br />
                Example: Arrival September 2024 → <strong>2024</strong>(First year, 4 months only) + <strong>2025</strong>(Second year) = End of tax exemption. There will be no tax exemption from 2026.
              
          </Callout>
          }

            {isValidYear && isJ1Researcher &&
          <Callout type="info" label="my tax exemption period">
                &bull; <strong>{arrivalNum}year</strong> — Apply for tax exemption (first year)
                <br />
                &bull; <strong>{arrivalNum + 1}year</strong> — Apply for tax exemption (second year)
                <br />
                &bull; <strong>{arrivalNum + 2}year~</strong> — Tax exemption ends
              </Callout>
          }

            {isValidYear && isStudent &&
          <Callout type="info" label="my tax exemption period">
                Article 21(1) scholarship/tuition exemption continues to apply as long as you are an NRA (up to 5 years).
                <br /><br />
                The $2,000/year tax exemption for living expenses purposes also applies during the NRA period.
              </Callout>
          }

            {visaType === "f1-student" &&
          <Callout type="info" label="See OPT/CPT">
                <T tip="Optional Practical Training — A system that allows F-1 students to get jobs in fields related to their major.">OPT</T> or{" "}
                <T tip="Curricular Practical Training — A system that allows F-1 students to work as interns, etc. during their studies.">CPT</T>Even while working as a Still within 5 years 
            <strong>NRA</strong>and{" "}
                <strong>FICA is exempt</strong>It works.
                <br /><br />
                OPT/CPT income is reported on a W-2 and reported on a 1040-NR.
              </Callout>
          }
          </>
        }

        {/* Form 8233 — for applicable visas */}
        {visa.form8233 &&
        <>
            <SectionLabel>
              <T tip="IRS form requesting alien tax treaty exemption from employer.">
                Form 8233
              </T>{" "}
              — Advance tax exemption application
            </SectionLabel>
            <Prose>
              <p>
                to the employer <Code>Form 8233</Code>If you file, you will have to pay income tax on each paycheck.{" "}
                <T tip="Withholding — Your employer takes taxes out of your paycheck and pays them to the IRS.">
                  withholding tax
                </T>
                You can get paid without being paid. A new submission is required each year.
              </p>
            </Prose>

            <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-px mt-6 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}>
            
              <div className="p-4" style={{ background: "var(--paper)" }}>
                <p className="text-[13px] font-bold mb-1" style={{ color: "var(--moss)" }}>If submitted</p>
                <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>Receive salary without income tax withholding</p>
              </div>
              <div className="p-4" style={{ background: "var(--paper)" }}>
                <p className="text-[13px] font-bold mb-1" style={{ color: "var(--accent)" }}>If not submitted</p>
                <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>After withholding tax, apply for refund later</p>
              </div>
            </div>
          </>
        }

        <Callout type="tip" label="reference">
          The official content of the tax treaty is:{" "}
          <T tip="IRS Publication 901 — U.S. Tax Treaties. This is an official IRS document that summarizes all tax treaties the United States has entered into.">
            IRS Publication 901 (U.S. Tax Treaties)
          </T>
          You can check it here.{" "}
          {isJ1Researcher ?
          "For Korea-related provisions, see Article 20." :
          isStudent ?
          "For Korea-related provisions, see Article 21." :
          isH1B ?
          "Please see Article 20 for Korea-related teaching/research provisions." :
          isL1 ?
          "There are no separate tax exemption provisions applicable to L-1." :
          ""}
          {visa.form8233 &&
          <>
              <br /><br />
              If you have not yet submitted Form 8233, contact your school/institution's HR or Payroll department. If you submit even this year's portion, you can reduce withholding tax for the remaining period.
            
          </>
          }
        </Callout>
      </>);

  }

  /* ==============================================================
     STEP 3 — 서류 준비
     ============================================================== */

  function Step3() {
    if (!visa) return <VisaPrompt />;

    const isResident = visaType === "green-card" || visaType === "citizen";
    const docs = visa.docs;
    const checkedCount = [...checkedDocs].filter((id) => docs.some((d) => d.id === id)).length;
    const totalCount = docs.length;
    const allChecked = checkedCount === totalCount;

    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}>
          
          Required Document Checklist
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          {visa.label} Prepare the documents required for tax reporting one by one
        </p>

        {/* Progress */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-1 rounded-full" style={{ background: "var(--rule-light)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalCount > 0 ? checkedCount / totalCount * 100 : 0}%`,
                background: allChecked ? "var(--moss)" : "var(--accent)"
              }} />
            
          </div>
          <span
            className="font-[family-name:var(--font-mono)] text-[12px] font-bold tabular-nums shrink-0"
            style={{ color: allChecked ? "var(--moss)" : "var(--ink-muted)" }}>
            
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
                style={{ borderBottom: "1px solid var(--rule-light)" }}>
                
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDoc(doc.id)}
                  className="mt-0.5" />
                
                <div>
                  <p
                    className="text-[14.5px] font-medium transition-all"
                    style={{
                      color: checked ? "var(--ink-faint)" : "var(--ink)",
                      textDecoration: checked ? "line-through" : "none"
                    }}>
                    
                    {doc.label}
                  </p>
                  <p className="text-[12.5px] mt-0.5" style={{ color: "var(--ink-faint)" }}>
                    {doc.desc}
                  </p>
                </div>
              </label>);

          })}
        </div>

        {allChecked &&
        <div
          className="animate-checklist-complete my-6 px-5 py-4 rounded-sm"
          style={{ background: "var(--moss-bg)", borderLeft: "3px solid var(--moss)" }}>
          
            <p className="text-sm font-medium" style={{ color: "var(--moss)" }}>
              All documents are ready!
            </p>
            <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
              Take the next step and file your taxes.
            </p>
          </div>
        }

        <Callout type="info" label="When is the W-2 due?">
          Employer every year <strong>Late January - early February</strong>to{" "}
          <T tip="Wage and Tax Statement. This is a document in which an employer summarizes annual salary income and taxes withheld.">
            W-2
          </T>
          is issued.
          {isResident ?
          " You can download an electronic W-2 from your employer's HR portal or ADP, for example. If you haven't received it by mid-February, contact HR." :
          " If you are part of a college or university, you may be able to download an electronic W-2 from a system such as Workday. If you haven't received it by mid-February, contact HR."}
        </Callout>

        {isResident &&
        <Callout type="tip" label="Preparation of Korean income data">
            <strong>Home Tax (hometax.go.kr)</strong>Obtain the following documents from:
            <br /><br />
            &bull; <strong>Proof of income amount</strong> — Check your Korean income history
            <br />
            &bull; <strong>Tax payment certificate</strong> — Proof of Korean taxes paid when applying to FTC
            <br />
            &bull; <strong>Withholding tax receipt</strong> — Details of taxes withheld from paychecks
            <br /><br />
            Totaling overseas financial accounts <strong>Over $10,000</strong> city <T tip="FBAR (FinCEN 114) — Form to report to the U.S. Treasury if your foreign financial accounts total more than $10,000. Submit separately from your tax return.">FBAR</T> Report, if it is over a certain amount <T tip="Form 8938 (FATCA) — Form for reporting foreign financial assets to the IRS under the Foreign Account Tax Compliance Act. Submit with your tax return.">Form 8938(FATCA)</T>is also needed.
          </Callout>
        }

        {!isResident &&
        <Callout type="warn" label="If you don't have an SSN">
            <T tip="Individual Taxpayer Identification Number — A taxpayer identification number issued by the IRS to foreign nationals who are unable to obtain a SSN.">ITIN</T>
            It can be replaced with . <Code>Form W-7</Code>You can apply for an ITIN by submitting it with your tax return (1040-NR).
            <br /><br />
            step, <strong>Form 8843 can be filed without a SSN or ITIN.</strong> Just write “NRA — No SSN/ITIN” in the SSN/ITIN field.
          </Callout>
        }

        {!isResident &&
        <Callout type="tip" label="I-94 output">
            <ol className="list-decimal ml-4 space-y-1 mt-1">
              <li>
                <T tip="I-94: U.S. entry/exit record. You can view/print online at the Customs and Border Protection (CBP) website.">
                  CBP website
                </T>
                (i94.cbp.dhs.gov) Access
              </li>
              <li>Click “Get Most Recent I-94”</li>
              <li>Search after entering passport information</li>
              <li>Print I-94 record (recommend saving as PDF)</li>
              <li><strong>Travel History</strong>Also print out (to check entry and departure dates by year)</li>
            </ol>
          </Callout>
        }

        {(visaType === "dependent" || visaType === "l2") &&
        <Callout type="info" label="Refer to accompanying visa documents">
            Visa documents of the primary visa holder ({visaType === "l2" ? "I-797 Approval Notice" : <>
              <T tip="DS-2019 — Document confirming participation in the exchange visit program issued by the J-1 visa sponsoring organization.">DS-2019</T>, <T tip="I-20 — Document certifying admission to an F-1 student. Issued by the school (SEVP certification body).">I-20</T></>} etc.) A copy is required.
            <br /><br />
            <T tip="EAD (Employment Authorization Document) — A work permit. This is a document required for accompanying visa holders (J-2, H-4, L-2, etc.) to work in the United States.">EAD</T>(Employment Authorization Document), prepare a copy of your EAD and W-2 as well.
          </Callout>
        }
      </>);

  }

  /* ==============================================================
     STEP 4 — 연방세 신고
     ============================================================== */

  function Step4() {
    if (!visa) return <VisaPrompt />;

    const isResident = visaType === "green-card" || visaType === "citizen";
    const isH1B = visaType === "h1b";
    const isL1 = visaType === "l1";
    const isL2 = visaType === "l2";
    const isH1BLike = isH1B || isL1;
    const isDependent = visaType === "dependent";
    const isDependentLike = isDependent || isL2;
    const isF1 = visaType === "f1-student";

    if (isResident) {
      return (
        <>
          <h1
            className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
            style={{ color: "var(--ink)" }}>
            
            federal tax return
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
            <T tip="Internal Revenue Service — The United States Internal Revenue Service.">IRS</T>Filing Federal Tax — Worldwide Income Reporting
          </p>

          <SectionLabel>01 — Form 1040 Basic</SectionLabel>
          <Prose>
            <p>
              {visaType === "citizen" ? "citizen" : "permanent resident"}Is{" "}
              <Code>Form 1040</Code>File your federal income taxes using . The process is the same as for U.S. citizens.
            
            </p>
          </Prose>
          <ul className="mt-3 space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
            {[
            "Standard Deduction applied according to Filing Status",
            "Taxation on Worldwide Income",
            "Subject to FICA (Social Security + Medicare) withholding",
            "Prepared based on US income documents such as W-2, 1099, etc. + Korean income data"].
            map((item, i) =>
            <li key={i} className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                {item}
              </li>
            )}
          </ul>

          <SectionLabel>02 — Worldwide Income</SectionLabel>
          <Callout type="warn" label="Worldwide Income Reporting Requirements">
            US residents <strong>All income generated worldwide</strong>must be reported. Income earned in Korea must also be included.
          
          </Callout>
          <ul className="mt-3 space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
            {[
            "Korean earned income (salary, business income)",
            "Korean bank interest, dividends",
            "Korean real estate rental income, capital gains",
            "Korean pension income",
            "Other worldwide income (investment income, etc.)"].
            map((item, i) =>
            <li key={i} className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                {item}
              </li>
            )}
          </ul>

          <Callout type="info" label="currency conversion">
            Korean won income is <strong><T tip="IRS Average Annual Exchange Rate — The official exchange rate published by the IRS each year. Use this exchange rate when converting your foreign income to U.S. dollars.">IRS Official Annual Average Exchange Rate</T></strong>Convert to US dollars and report. Search for “Yearly Average Currency Exchange Rates” on the IRS website.
          
          </Callout>

          <SectionLabel>03 — FEIE vs FTC Selection Guide</SectionLabel>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-px my-4 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}>
            
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
                FTC Recommends (Most)
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>• If you live in the US and have Korean income</li>
                <li>• If you paid taxes in Korea</li>
                <li>• If there is investment income (interest/dividends)</li>
                <li>• Submit Form 1116</li>
              </ul>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--moss)" }}>
                Consider FEIE
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>• If you live in Korea and have earned income</li>
                <li>• If the Korean tax rate is lower than the US</li>
                <li>• When meeting overseas residence requirements (Physical Presence)</li>
                <li>• Submit Form 2555</li>
              </ul>
            </div>
          </div>
          <Callout type="warn" label="Cannot be applied in duplicate">
            You cannot apply FTC and FEIE at the same time for the same income. Once you choose FEIE, you cannot choose it again for 5 years after cancellation, so choose carefully.
          
          </Callout>

          <SectionLabel>04 — Overseas account reporting</SectionLabel>
          <Prose>
            <p>
              Permanent residents and citizens who have a financial account in Korea <strong>Obligation to report foreign accounts</strong>There is. Form 1040 
              <Code><T tip="Schedule B — A schedule that must be attached if interest and dividend income exceeds $1,500. In Part III, answer whether you have an overseas financial account.">Schedule B</T> Part III</Code>You must answer whether you have an overseas financial account.
            </p>
          </Prose>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-px my-6 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}>
            
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
                FBAR (FinCEN 114)
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>• Overseas financial accounts combined <strong>Over $10,000</strong> city</li>
                <li>• Deadline: 4/15 (automatic extension 10/15)</li>
                <li>&bull; <T tip="BSA E-Filing — Bank Secrecy Act electronic filing system. This is FinCEN's website for filing FBARs online.">BSA E-Filing</T> Electronic submission to system</li>
                <li>• Not the IRS. <strong><T tip="FinCEN (Financial Crimes Enforcement Network) — The U.S. Department of the Treasury's Financial Crimes Enforcement Network. You file your FBAR with this agency, not the IRS.">FinCEN</T></strong>submitted to</li>
                <li>• Fine for failure to file: $10,000+ per occurrence.</li>
              </ul>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--moss)" }}>
                Form 8938 (FATCA)
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>• When overseas financial assets exceed the threshold</li>
                <li>• Submit to the IRS with your tax return (1040)</li>
                <li>• Includes financial accounts + stocks, insurance, pensions, etc.</li>
                <li>• Failure to file fine: $10,000+</li>
              </ul>
            </div>
          </div>

          <Callout type="info" label="Form 8938 Threshold">
            <strong>Live in the United States:</strong> Single $50,000 (year-end)/$75,000 (year-round), married $100,000/$150,000 jointly
            <br />
            <strong>Living abroad:</strong> Single $200,000 (year-end)/$300,000 (year-round), married $400,000/$600,000 jointly
          </Callout>

          <div
            className="my-6 p-5"
            style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 2 }}>
            
            <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>
              FBAR vs Form 8938 Comparison
            </p>
            <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
              {[
              { item: "Submission to", fbar: "FinCEN (Department of the Treasury)", f8938: "IRS (Internal Revenue Service)" },
              { item: "Threshold", fbar: "$10,000 (combined)", f8938: "$50,000+ (by residence)" },
              { item: "How to submit", fbar: "BSA E-Filing (Online)", f8938: "Submit with your 1040" },
              { item: "target asset", fbar: "Financial accounts only", f8938: "Financial accounts + other financial assets" },
              { item: "deadline", fbar: "4/15 (automatic extension 10/15)", f8938: "Same as tax filing deadline" }].
              map((row) =>
              <div key={row.item} className="grid grid-cols-3 gap-2 py-2.5 text-[12.5px]" style={{ borderBottom: "1px solid var(--rule-light)" }}>
                  <span className="font-medium" style={{ color: "var(--ink)" }}>{row.item}</span>
                  <span style={{ color: "var(--ink-muted)" }}>{row.fbar}</span>
                  <span style={{ color: "var(--ink-muted)" }}>{row.f8938}</span>
                </div>
              )}
            </div>
          </div>

          <SectionLabel>05 — High level form (CPA recommended)</SectionLabel>
          <Callout type="warn" label="Need expert help">
            The form below is very complicated, and if not submitted, <strong>$10,000 or more per case</strong>A fine may be imposed. If applicable, be sure to 
            <strong>with international tax experience <T tip="CPA (Certified Public Accountant) — American certified public accountant. A CPA specializing in international taxation can help you with complex reports such as foreign income, FBAR, and PFIC.">CPA</T></strong>Please consult with
          </Callout>
          <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
            {[
            { form: "Form 3520", desc: "Report when receiving overseas gift/inheritance of over $100,000", penalty: "25% of maximum unreported amount" },
            { form: "Form 8621", desc: "PFIC (Passive Foreign Investment Company) reporting — Korean funds, ETFs", penalty: "Taxation + Interest Penalty" },
            { form: "Form 5471", desc: "When holding more than 10% of shares of a foreign corporation (Korean corporation)", penalty: "$10,000/case" },
            { form: "Form 8865", desc: "When holding a foreign partnership", penalty: "$10,000/case" },
            { form: "Form 8858", desc: "When holding an overseas disregarded entity", penalty: "$10,000/case" },
            { form: "Form 3520-A", desc: "Annual reporting by foreign trusts", penalty: "$10,000 or 5% of trust assets" }].
            map((item) =>
            <div
              key={item.form}
              className="py-3.5"
              style={{ borderBottom: "1px solid var(--rule-light)" }}>
              
                <div className="flex items-baseline gap-3 mb-1">
                  <Code>{item.form}</Code>
                  <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>{item.desc}</span>
                </div>
                <p className="text-[12.5px] ml-[4px]" style={{ color: "var(--accent)" }}>
                  fine: {item.penalty}
                </p>
              </div>
            )}
          </div>

          <Callout type="info" label="Korean Fund/ETF = PFIC">
            Funds or ETFs registered in Korea are subject to U.S. tax law. <strong><T tip="PFIC (Passive Foreign Investment Company) — A passive foreign investment company. This applies to Korean funds and ETFs, and very unfavorable tax rates are applied. Report on Form 8621.">PFIC</T>(Passive Foreign Investment Company)</strong>It is classified as: PFICs have a very unfavorable tax regime, so be sure to consult a CPA if you own Korean funds.
          
          </Callout>

          <SectionLabel>06 — Authoring tools</SectionLabel>
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-px my-4 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}>
            
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-bold text-[14px] mb-3" style={{ color: "var(--ink)" }}>TurboTax</p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>• Free to paid version</li>
                <li>• Federal tax + state tax</li>
                <li>• e-file support</li>
                <li>• Overseas income support (paid)</li>
              </ul>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-bold text-[14px] mb-3" style={{ color: "var(--ink)" }}>H&R Block</p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>• Online + Offline</li>
                <li>• Federal tax + state tax</li>
                <li>• e-file support</li>
                <li>• Tax accountant consultation available</li>
              </ul>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-bold text-[14px] mb-3" style={{ color: "var(--ink)" }}>FreeTaxUSA</p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>• Federal Tax Free</li>
                <li>• State tax ~$15</li>
                <li>• e-file support</li>
                <li>• Suitable for simple reporting</li>
              </ul>
            </div>
          </div>

          <Callout type="tip" label="tip">
            If you have foreign income, FBAR/FATCA, PFIC, etc., software alone may have limitations. In complex cases, we recommend consulting with a CPA specializing in international tax.
          
          </Callout>
        </>);

    }

    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}>
          
          federal tax return
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          <T tip="Internal Revenue Service — The United States Internal Revenue Service.">IRS</T>Federal Tax submitted to
        </p>

        <SectionLabel>Confirm reported case</SectionLabel>

        {isH1BLike ?
        <div
          className="grid grid-cols-1 gap-px my-4 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}>
          
            <div className="p-5" style={{ background: "var(--accent-bg)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
                most {visa.label} — RA
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 1040</Code> submit. Available for TurboTax, H&R Block, etc.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                Deadline: April 15, 2026
              </p>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>
                {visa.label} First year NRA (stay less than 183 days)
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 1040-NR</Code> Submit, or as First-Year Choice <Code>Form 1040</Code>.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                NRA Part: Using Sprintax
              </p>
            </div>
          </div> :
        isDependentLike ?
        <div
          className="grid grid-cols-1 gap-px my-4 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}>
          
            <div className="p-5" style={{ background: "var(--accent-bg)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
                NRA + no income
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 8843</Code>Submit only. You can submit without a SSN/ITIN.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                Deadline: June 15, 2026
              </p>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>
                NRA + EAD employment income
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 1040-NR</Code> + <Code>Form 8843</Code> Submit together.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                Deadline: 4/15 with wages withheld, 6/15 without.
              </p>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>
                RA (when converting to RA for primary visa holder)
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 1040</Code> submit. Available for TurboTax, H&R Block, etc.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                Deadline: April 15, 2026
              </p>
            </div>
          </div> :

        <div
          className="grid grid-cols-1 gap-px my-4 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}>
          
            <div className="p-5" style={{ background: "var(--accent-bg)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
                Case 1 — NRA + no income
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 8843</Code>Submit only. You can submit without a SSN/ITIN.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                Deadline: June 15, 2026
              </p>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
                Case 2 — NRA + US income
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 1040-NR</Code> + <Code>Form 8843</Code> Submit together.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                Deadline: 4/15 with wages withheld, 6/15 without.
              </p>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>
                Case 3 — RA (Resident)
              </p>
              <p className="text-[14px]" style={{ color: "var(--ink-light)" }}>
                <Code>Form 1040</Code> submit. Available for TurboTax, H&R Block, etc.
              </p>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
                Deadline: April 15, 2026
              </p>
            </div>
          </div>
        }

        {/* Form 8843 section */}
        {!isH1BLike &&
        <>
            <SectionLabel>01 — Form 8843 (required for all NRAs)</SectionLabel>
            <Prose>
              <p>
                Anyone who has stayed in the U.S.{" "}
                <T tip="Non-Resident Alien. I am a non-resident alien for U.S. tax purposes.">NRA</T>
                This is a form that must be submitted.
              </p>
            </Prose>
            <ul className="mt-3 space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
              {[
            "All NRA required submissions regardless of income",
            isDependentLike ?
            "Applicant visa holder must also submit one sheet individually (separate from main visa holder)" :
            "Spouse (accompanying visa) and dependents must also submit one sheet each separately.",
            "Record personal information, visa information, period of stay, etc.",
            "If you have no income at all, just submit this form.",
            "You can submit without a SSN or ITIN (write “NRA — No SSN” in the appropriate field)."].
            map((item, i) =>
            <li key={i} className="flex items-baseline gap-3">
                  <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                  {item}
                </li>
            )}
            </ul>
          </>
        }

        {/* Form 1040-NR section */}
        {!isH1BLike &&
        <>
            <SectionLabel>02 — Form 1040-NR (NRA + if you have income)</SectionLabel>
            <Prose>
              <p>
                Submitted by NRA with income in the United States{" "}
                <T tip="U.S. Nonresident Alien Income Tax Return.">income tax return form</T>no see.
              </p>
            </Prose>
            <ul className="mt-3 space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                <T tip="W-2: Annual salary income and tax withholding statement issued by your employer.">W-2</T>Use the salary income and withholding tax information provided in
              </li>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                You can also claim tax exemption benefits under the Korea-U.S. Tax Treaty using this form.
              </li>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                <T tip="1042-S: This is a document showing income exempted by tax treaty.">1042-S</T>If there is one, please refer to it and write it together.
              </li>
              <li className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                If you don't have an SSN <Code><T tip="Form W-7 — Individual Taxpayer Identification Number (ITIN) application form. Foreigners who cannot receive an SSN use it when reporting taxes.">Form W-7</T></Code>by{" "}
                <T tip="Individual Taxpayer Identification Number.">ITIN</T>Apply together (enclosed with Form 1040-NR)
              </li>
            </ul>

            {!isH1BLike &&
          <Callout type="warn" label="caution">
                <strong>TurboTax and H&R Block are not available to the NRA.</strong> These software are for Resident use only.
              </Callout>
          }
          </>
        }

        {/* H-1B / L-1 RA specific */}
        {isH1BLike &&
        <>
            <SectionLabel>01 — Form 1040 ({visa.label} RA)</SectionLabel>
            <Prose>
              <p>
                most {visa.label} The holder is an RA. <Code>Form 1040</Code>Use . Report using the same procedures as U.S. citizens.
              
            </p>
            </Prose>
            <ul className="mt-3 space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
              {[
            "Standard Deduction: $15,700 (as of 2025, Single)",
            "Taxation on Worldwide Income",
            "If you have Korean income, report it together (prevent double taxation with Foreign Tax Credit)",
            "FICA (Social Security + Medicare) Withholding — Not Refundable",
            "Prepared based on income documents such as W-2, 1099, etc."].
            map((item, i) =>
            <li key={i} className="flex items-baseline gap-3">
                  <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                  {item}
                </li>
            )}
            </ul>

            <Callout type="info" label="Worldwide Income">
              RA is not only for U.S. income; <strong>worldwide income</strong>You have a reporting obligation.
              <br /><br />
              • Including Korean bank interest, real estate rental income, investment income, etc.
              <br />
              • If you have already paid taxes in Korea <T tip="Form 1116 — Foreign Tax Credit. Deduct taxes paid abroad from your U.S. taxes.">Form 1116 (Foreign Tax Credit)</T>prevent double taxation
              <br />
              • When the total amount of overseas financial accounts exceeds $10,000 <T tip="Report of Foreign Bank and Financial Accounts. Form to report to the U.S. Treasury if you have a foreign financial account.">FBAR</T> Report required
            </Callout>

            <Callout type="warn" label="FICA is not eligible for refunds">
              {visa.label} The holder's FICA (6.2% Social Security + 1.45% Medicare) is the normal withholding tax. Because it is not subject to FICA exemption like F-1 and J-1, 
            <strong>You should not apply for a FICA refund</strong>.
            </Callout>

            {isL1 &&
          <Callout type="warn" label="L-1 RA — Prepare for FBAR/Form 8938">
                L-1 expatriates often become RAs within the first year of their arrival. <strong>Obligation to report overseas accounts</strong>can happen right away.
                <br /><br />
                &bull; <strong>FBAR (FinCEN 114)</strong>: Submitted when total Korean bank, securities, and insurance accounts exceed $10,000 (Deadline: 4/15, automatic extension 10/15)
                <br />
                &bull; <strong>Form 8938 (FATCA)</strong>: Submit with 1040 when overseas financial assets exceed the threshold
                <br /><br />
                L-1 expatriates with accounts in Korea <strong>From the first year of arrival</strong> Check out these reporting obligations.
              </Callout>
          }
          </>
        }

        {/* Tools section */}
        <SectionLabel>{isH1BLike ? "02" : "03"} — Authoring tools</SectionLabel>

        {isH1BLike ?
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-px my-4 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}>
          
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-bold text-[14px] mb-3" style={{ color: "var(--ink)" }}>
                <T tip="America's most used tax preparation software.">TurboTax</T>
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>• RA only (applies to most H-1Bs)</li>
                <li>• Various free to paid versions</li>
                <li>• Supports both federal and state taxes</li>
                <li>• e-file support</li>
                <li>• Korean language not supported</li>
              </ul>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-bold text-[14px] mb-3" style={{ color: "var(--ink)" }}>
                <T tip="America's leading tax reporting service.">H&R Block</T>
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>• RA only</li>
                <li>• Online + offline branches</li>
                <li>• Supports both federal and state taxes</li>
                <li>• e-file support</li>
                <li>• Tax accountant consultation available</li>
              </ul>
            </div>
          </div> :

        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-px my-4 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}>
          
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-bold text-[14px] mb-3" style={{ color: "var(--ink)" }}>
                <T tip="NRA's exclusive online tax return preparation tool.">Sprintax</T>
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>• Supports both federal and state taxes</li>
                <li>• Free codes available from schools</li>
                <li>• Cost ~$25-35 plus state tax.</li>
                <li>• After writing, print and mail</li>
                <li>• Federal tax e-file available (additional cost)</li>
              </ul>
            </div>
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-bold text-[14px] mb-3" style={{ color: "var(--ink)" }}>
                <T tip="NRA-specific federal tax preparation tool provided by the university.">GLACIER Tax Prep</T>
              </p>
              <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
                <li>• Free if provided by school</li>
                <li>• Federal tax only (state tax not supported)</li>
                <li>• Access code sent via email</li>
                <li>• After writing, print and mail</li>
              </ul>
            </div>
          </div>
        }

        <Callout type="tip" label="tip">
          {isH1BLike ?
          "TurboTax Free Edition is free to use for simple tax returns (W-2 income only). Complex situations (investment income, overseas income, etc.) require a paid version." :
          <>Most colleges will provide free codes for Sprintax or GLACIER Tax Prep. school 
            <T tip="International Office — School department that supports international students/visiting researchers.">International Office</T> Or contact HR first.</>
          }
        </Callout>

        {/* OPT/CPT note for F-1 */}
        {isF1 &&
        <Callout type="info" label="OPT/CPT tax reporting">
            F-1 students working on OPT or CPT:
            <br /><br />
            • If within 5 years, still <strong>NRA</strong> → Use Form 1040-NR
            <br />
            &bull; <strong>FICA exemption</strong> (If the employer collected the money incorrectly, you can apply for a refund)
            <br />
            • FICA on W-2 <T tip="Withholding — Your employer deducts taxes in advance from your paycheck and pays them to the IRS.">withholding tax</T>If so, ask your employer to correct it first.
            <br />
            • If correction is not possible <Code><T tip="Form 843 — IRS form to claim a tax refund or request reduction of taxes already paid.">Form 843</T></Code> + <Code><T tip="Form 8316 — Supplemental form to submit with Form 843 when claiming a FICA refund.">Form 8316</T></Code>Apply for a refund directly to the IRS
          </Callout>
        }

        {/* Dependent / L-2 EAD note */}
        {isDependentLike &&
        <Callout type="info" label="FICA for EAD employment">
            {isL2 ?
          <>If employed with L-2 EAD: Since the L-1 primary visa holder is an RA, the L-2 is also usually an RA. <strong>FICA payment eligibility</strong>no see.</> :

          <>
                In case of employment with J-2 EAD: If the primary visa holder is an NRA, the accompanying visa is also an NRA. <strong>FICA applies to J-2 EAD employment income</strong>It works.
                <br /><br />
                In case of employment with H-4 EAD: Since the H-1B primary visa holder is an RA, the companion visa is also usually an RA. <strong>FICA payment eligibility</strong>no see.
              </>
          }
          </Callout>
        }

        <SectionLabel>{isH1BLike ? "03" : "04"} — Information required when writing</SectionLabel>
        <ul className="space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
          {[
          "Passport information (name, number, expiration date)",
          ...(visaType === "f1-student" ? ["I-20 information (SEVIS ID, school name)"] : []),
          ...(visaType === "j1-researcher" || visaType === "j1-student" ? ["DS-2019 information (program number, sponsoring organization)"] : []),
          ...(visaType === "dependent" || visaType === "l2" ? ["Visa document information for primary visa holders"] : []),
          ...(visaType === "l1" ? ["I-797 Approval Notice Information"] : []),
          "I-94 record (date of entry, date of departure)",
          "U.S. entry/exit dates — need to organize by year",
          isH1BLike ? "SSN (Social Security Number)" : "Social Security Number (SSN) or ITIN",
          "W-2 (Salary Income, Withholding Tax)",
          ...(!isH1BLike ? ["1042-S (Income subject to tax treaty, if applicable)"] : []),
          ...(visaType === "l1" ? ["Certificate of application of social security agreement (if applicable)"] : []),
          "1099-INT / 1099-DIV / 1099-NEC (if applicable)"].
          map((item, i) =>
          <li key={i} className="flex items-baseline gap-3">
              <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
              {item}
            </li>
          )}
        </ul>

        <Callout type="info" label="E-file">
          {isH1BLike ?
          "TurboTax and H&R Block both support e-file. It's faster and safer than mail, and you can receive your refund within 2-3 weeks." :
          <>Pay your federal taxes through Sprintax{" "}
              <T tip="Electronic Filing — Electronic filing of tax documents online.">e-file</T>
              You can do it too. If possible, it is faster and safer than mail. However, additional costs may apply.</>
          }
        </Callout>
      </>);

  }

  /* ==============================================================
     STEP 5 — 주세 신고
     ============================================================== */

  function Step5() {
    const isResident = visaType === "green-card" || visaType === "citizen";

    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}>
          
          state tax return
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          Be careful where you live{" "}
          <T tip="State Income Tax — Income tax paid to each state government. You must report it separately from your federal taxes. Tax rates vary by state.">
            State Tax
          </T>{" "}
          declaration
        </p>

        <Prose>
          <p>
            In the United States, in addition to federal taxes, you must also file state income taxes separately. However, if you live in a state that does not have an income tax, you do not need to file a state tax return.
          </p>
        </Prose>

        <SectionLabel>States with no income tax</SectionLabel>
        <div className="flex flex-wrap gap-2 mb-2">
          {NO_TAX_STATES.map((state) =>
          <span
            key={state}
            className="font-[family-name:var(--font-mono)] text-[12px] px-2.5 py-1"
            style={{
              background: "var(--moss-bg)",
              color: "var(--moss)",
              borderRadius: 2
            }}>
            
              {state}
            </span>
          )}
        </div>
        <p className="text-[13px] mt-2" style={{ color: "var(--ink-faint)" }}>
          If you live in one of the states above and do not work in another state, you do not need to file state taxes.
        </p>

        <SectionLabel>Quick check whether state tax reporting is required</SectionLabel>
        <Callout type="tip" label="W-2 Verification Method">
          <T tip="W-2 — Annual salary income and tax withholding statement issued by your employer. Various information is listed for each box number.">W-2</T>of <strong><T tip="Box 15 — This is where the W-2's state code is written. Indicate which state you paid taxes to.">Box 15</T> (State)</strong>, <strong><T tip="Box 16 — The space on your W-2 containing the amount of taxable income for your state.">Box 16</T> (State wages)</strong>, <strong><T tip="Box 17 — The space on your W-2 that contains the amount of income tax withheld for your state. If you have this amount, you must file a state tax return to receive a refund.">Box 17</T> (State income tax)</strong>Check out .
          <br /><br />
          • If there is an amount in Box 17 → state income tax was withheld, <strong>You must file a state tax return for a refund</strong>You can receive it.
          <br />
          • If Box 17 is 0 and the state has no income tax → State tax reporting is not required.
        </Callout>

        <SectionLabel>states with income taxes</SectionLabel>
        <ul className="space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
          {[
          "Each state has different forms and procedures.",
          isResident || visaType === "h1b" || visaType === "l1" ?
          "State taxes can also be prepared at TurboTax, H&R Block, FreeTaxUSA, etc." :
          "NRA: Recommend using Sprintax (automatically fills out applicable state forms, ~$25-35)",
          "If filling out in person: Download the form from your state's Department of Revenue website",
          "If you work in multiple states, you must report separately to each state."].
          map((item, i) =>
          <li key={i} className="flex items-baseline gap-3">
              <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
              {item}
            </li>
          )}
        </ul>

        {isResident ?
        <Callout type="info" label="State Tax Standard Deduction">
            Each state has different Standard Deduction amounts. If you use tax software, this will be applied automatically.
          </Callout> :

        <Callout type="info" label="Tax treaty + liquor tax">
            In most states, the tax exemption benefits of the US-Korea Tax Treaty also apply to state taxes.
            {visaType === "h1b" || visaType === "l1" ?
          ` ${visaType === "l1" ? "L-1" : "H-1B"} For RA, standard deduction applies to state taxes.` :
          " Sprintax takes care of this for you."}
          </Callout>
        }

        <SectionLabel>{isResident || visaType === "h1b" || visaType === "l1" ? "How to report state taxes" : "File your state taxes with Sprintax"}</SectionLabel>
        <div className="space-y-3">
          {(isResident || visaType === "h1b" || visaType === "l1" ?
          [
          "Complete with federal taxes from TurboTax, H&R Block, or FreeTaxUSA",
          "State tax forms are automatically generated",
          "Can be submitted with federal taxes via e-file",
          "Some states require separate submissions — see software instructions"] :

          [
          "Complete your federal taxes first with Sprintax",
          "Additional application for state tax (separate cost ~$25-35)",
          "Federal tax documents will be emailed immediately, and state tax documents will be emailed approximately 3 days later.",
          "Print out the documents you received and mail them to your state tax office."]).

          map((item, i) =>
          <div key={i} className="flex gap-4 items-baseline">
              <span
              className="font-[family-name:var(--font-mono)] text-[12px] font-bold shrink-0"
              style={{ color: "var(--accent)" }}>
              
                {i + 1}
              </span>
              <span className="text-[14px]" style={{ color: "var(--ink-light)" }}>{item}</span>
            </div>
          )}
        </div>

        <Callout type="warn" label="Local Tax">
          In some cities (e.g. Pittsburgh, NYC, etc.) a separate{" "}
          <T tip="Local Tax — Local tax at the city/county level. They are not present in all cities, and if so, separate reporting is required.">
            local tax
          </T>
          imposes. Check the tax regulations in your city.
        </Callout>
      </>);

  }

  /* ==============================================================
     STEP 6 — 서류 제출
     ============================================================== */

  function Step6() {
    const isResident = visaType === "green-card" || visaType === "citizen";

    if (isResident) {
      return (
        <>
          <h1
            className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
            style={{ color: "var(--ink)" }}>
            
            How to submit documents
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
            Where and how do I send the completed tax documents?
          </p>

          <Callout type="tip" label="e-file recommendation">
            {visaType === "citizen" ? "citizen" : "permanent resident"}from TurboTax, H&R Block, FreeTaxUSA, etc.{" "}
            <strong>e-file</strong>You can submit it right away. It is the fastest and safest because it does not require mailing.
          
          </Callout>

          <SectionLabel>e-file (electronic submission)</SectionLabel>
          <Prose>
            <p>
              Once you complete it in your tax software, you can e-file it right away. Unlike the NRA, mail-in submission is not the default; 
              <strong>e-file is the fastest and safest way</strong>no see.
            </p>
          </Prose>
          <ul className="mt-3 space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
            {[
            "Click ‘File’ or ‘Submit’ in the software",
            "IRS confirmation within 24 hours",
            "Refunds will be deposited into your bank account within 2-3 weeks (Direct Deposit — direct deposit into your bank account)",
            "State taxes can also be e-filed (most states)"].
            map((item, i) =>
            <li key={i} className="flex items-baseline gap-3">
                <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
                {item}
              </li>
            )}
          </ul>

          <SectionLabel>When submission by mail is required</SectionLabel>
          <Prose>
            <p>
              Some situations may require submission by mail (e.g. attaching certain forms, applying for an ITIN, etc.).
            </p>
          </Prose>
          <div
            className="grid grid-cols-1 gap-px my-4 overflow-hidden"
            style={{ background: "var(--rule)", borderRadius: 2 }}>
            
            <div className="p-5" style={{ background: "var(--paper)" }}>
              <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>
                Form 1040 Mailing Address
              </p>
              <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                Your IRS mailing address will vary depending on your state. Check the IRS website by searching “Where to File Paper Tax Returns.”
              </p>
            </div>
          </div>

          <SectionLabel>Final check before submission</SectionLabel>
          <div className="space-y-2">
            {[
            "Make sure all forms are signed",
            "Check required documents such as W-2, 1099, etc.",
            "FBAR must be submitted separately through BSA E-Filing",
            "File Form 8938 with your 1040",
            "Keep copies of all documents (minimum 3 years, preferably 7 years)"].
            map((item, i) =>
            <div key={i} className="flex gap-3 items-baseline text-[14px]">
                <span className="font-[family-name:var(--font-mono)] text-[11px] font-bold" style={{ color: "var(--ink-faint)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ color: "var(--ink-light)" }}>{item}</span>
              </div>
            )}
          </div>

          <Callout type="info" label="Submit FBAR separately">
            <T tip="FBAR (FinCEN 114) — Foreign Financial Account Reporting. It must be submitted separately from your tax return.">FBAR</T>(FinCEN 114) requires tax returns and <strong>separately</strong> <T tip="BSA E-Filing — Bank Secrecy Act electronic filing system. Submit online at bsaefiling.fincen.treas.gov.">BSA E-Filing</T> Submit electronically in the system. I'm not sending it to the IRS.
          
          </Callout>
        </>);

    }

    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}>
          
          How to submit documents
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          Where and how do I send the completed tax documents?
        </p>

        {(visaType === "h1b" || visaType === "l1") &&
        <Callout type="tip" label="e-file recommendation">
            {visaType === "l1" ? "L-1" : "H-1B"} If you're an RA, go to TurboTax or H&R Block. <strong>e-file</strong>You can submit it right away. It is the fastest and safest because it does not require mailing.
          
        </Callout>
        }

        <SectionLabel>IRS mailing address (federal tax)</SectionLabel>
        <div
          className="grid grid-cols-1 gap-px my-4 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}>
          
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--moss)" }}>
              If there is no tax to pay (refund or $0)
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
              If there is tax to pay (check enclosed)
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
              If you only submit Form 8843
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

        <Callout type="warn" label="Only use USPS!">
          All of the above addresses are <strong><T tip="P.O. Box (Post Office Box) — Post office box address. It cannot be delivered by private courier companies (UPS, FedEx, etc.), but only by the USPS (United States Postal Service).">P.O. Box</T></strong>no see.
          <strong> Delivery is not possible through private couriers such as UPS, FedEx, and DHL.</strong>
          certainly <strong><T tip="USPS (United States Postal Service) — United States Postal Service. IRS P.O. When sending tax documents to a Box address, you must use USPS.">USPS</T> (US Post Office)</strong>Please use .
        </Callout>

        <SectionLabel>Summary of where to submit</SectionLabel>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-px my-4 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}>
          
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
              Federal Tax → IRS
            </p>
            <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
              {visaType === "h1b" || visaType === "l1" ?
              <>
                  <li><Code>1040</Code> (or <Code>1040-NR</Code>)</li>
                  <li>Attach original W-2</li>
                  <li>Send (or e-file) to the IRS address above.</li>
                </> :

              <>
                  <li><Code>1040-NR</Code> + <Code>8843</Code></li>
                  <li>Attach original W-2</li>
                  <li>Attach original 1042-S (if applicable)</li>
                  <li>Send to IRS address above</li>
                </>
              }
            </ul>
          </div>
          <div className="p-5" style={{ background: "var(--paper)" }}>
            <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>
              State tax → State
            </p>
            <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-muted)" }}>
              <li>State tax forms (varies by state)</li>
              <li>Attach copy of W-2</li>
              <li>address: {visaType === "h1b" || visaType === "l1" ? "software" : "Sprintax"} Listed in the guide</li>
              <li>federal taxes and <strong>separate envelope</strong>Ship to</li>
            </ul>
          </div>
        </div>

        <Callout type="info" label="separate envelope">
          For federal taxes, go to the IRS; for state taxes, go to the state tax office. <strong>separate envelope</strong>They must be sent to separate addresses.
        </Callout>

        <SectionLabel>How to mail</SectionLabel>
        <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
          {[
          {
            tag: "suggestion",
            tagColor: "var(--moss)",
            name: "USPS Priority Mail",
            price: "~$8-10",
            desc: "Arrives 2-3 days, Trackable, USPS only — IRS P.O. Definitely delivered to the box"
          },
          {
            tag: "commonly",
            tagColor: "var(--ink-muted)",
            name: "USPS Certified Mail + First Class",
            price: "~$5-7",
            desc: "Trackable, 5-7 days to arrive. Use when proof of receipt is required"
          },
          {
            tag: "It's not good",
            tagColor: "var(--accent)",
            name: "USPS First Class Mail",
            price: "~$1-2",
            desc: "No tracking, risk of loss. Not recommended for tax documents"
          }].
          map((m) =>
          <div
            key={m.name}
            className="flex items-start gap-4 py-3.5"
            style={{ borderBottom: "1px solid var(--rule-light)" }}>
            
              <span
              className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm shrink-0 mt-0.5 text-white"
              style={{ background: m.tagColor }}>
              
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
          )}
        </div>

        <SectionLabel>Final check before submission</SectionLabel>
        <div className="space-y-2">
          {[
          "Make sure all forms are signed",
          "Confirm that necessary documents such as W-2, 1042-S, etc. are enclosed.",
          "Prepare federal and state taxes in separate envelopes",
          "Write the return address on the envelope",
          "Keep copies of all documents (scanning recommended)",
          "Keep your postal receipt (tracking number)",
          "Ships only with USPS (no UPS/FedEx!)"].
          map((item, i) =>
          <div key={i} className="flex gap-3 items-baseline text-[14px]">
              <span className="font-[family-name:var(--font-mono)] text-[11px] font-bold" style={{ color: "var(--ink-faint)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ color: "var(--ink-light)" }}>{item}</span>
            </div>
          )}
        </div>

        <Callout type="tip" label="E-file">
          {visaType === "h1b" || visaType === "l1" ?
          "If you e-file with TurboTax or H&R Block, it will be submitted immediately without mailing. Receipt will be confirmed within 24 hours, and refund will be possible within 2-3 weeks." :
          <>Federal Tax at Sprintax{" "}
              <T tip="e-file: Electronically file your tax documents online.">e-file</T>
              If possible, it is much faster and safer than postal mail. If you e-file, you don't have to worry about the postal address above.</>
          }
        </Callout>
      </>);

  }

  /* ==============================================================
     STEP 7 — 환급 추적
     ============================================================== */

  function Step7() {
    const isResident = visaType === "green-card" || visaType === "citizen";
    const isH1B = visaType === "h1b";
    const isL1 = visaType === "l1";
    const isH1BLike = isH1B || isL1;

    return (
      <>
        <h1
          className="font-[family-name:var(--font-serif)] text-[clamp(24px,4vw,36px)] font-black leading-[1.2] tracking-tight mb-2"
          style={{ color: "var(--ink)" }}>
          
          Refund Tracking
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>
          How to check the status of your tax refund
        </p>

        <Callout type="info" label="yet again">
          <strong><T tip="Tax Return — The act of completing and submitting a tax return. It is the responsibility of every taxpayer.">Tax Return</T> &ne; <T tip="Refund — refund. If the tax withheld is more than the actual tax, you will receive the difference back.">Refund</T></strong>
          <br />
          Tax reporting is mandatory, and depending on the results, there may be a refund or additional payment.
          <T tip="Withholding — Your employer deducts taxes in advance from your paycheck and pays them to the IRS. Your federal tax withholding amount will appear in Box 2 of your W-2.">withholding tax</T>(W-2 Box 2) If the amount paid is more than the actual tax, you will receive a refund for the difference.
        </Callout>

        <SectionLabel>Federal Tax Refund Tracking</SectionLabel>
        <Prose>
          <p>
            From the IRS website <strong>&ldquo;Where&apos;s My Refund&rdquo;</strong>Search and access.
          </p>
        </Prose>

        <div
          className="mt-4 p-5"
          style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 2 }}>
          
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>
            Information needed
          </p>
          <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--ink-light)" }}>
            <li>&bull;{" "}
              <T tip="Social Security Number — U.S. Social Security Number. It is a 9-digit number.">SSN</T>{" "}
              (or{" "}
              <T tip="Individual Taxpayer Identification Number — A taxpayer identification number for aliens without a SSN.">ITIN</T>)
            </li>
            <li>&bull;{" "}
              <T tip="Filing Status — Filing status (Single, Married, etc.) when filing taxes.">
                Filing Status
              </T>
              {" "}({isResident || isH1BLike ? "tax software" : "Sprintax"} check in documents)
            </li>
            <li>&bull;{" "}
              <T tip="Refund Amount — Expected refund amount.">
                Refund Amount
              </T>
              {" "}({isResident || isH1BLike ? "tax software" : "Sprintax"} check in documents)
            </li>
          </ul>
        </div>

        <div
          className="grid grid-cols-2 gap-px my-6 overflow-hidden"
          style={{ background: "var(--rule)", borderRadius: 2 }}>
          
          <div className="py-5 px-4 text-center" style={{ background: "var(--paper)" }}>
            <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--ink-muted)" }}>
              mail submission
            </p>
            <p className="font-[family-name:var(--font-serif)] text-[28px] font-black" style={{ color: "var(--ink)" }}>
              6-12 weeks
            </p>
            <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>Available to view after approximately 4 weeks</p>
          </div>
          <div className="py-5 px-4 text-center" style={{ background: "var(--paper)" }}>
            <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--ink-muted)" }}>
              E-file
            </p>
            <p className="font-[family-name:var(--font-serif)] text-[28px] font-black" style={{ color: "var(--moss)" }}>
              2-3 weeks
            </p>
            <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>Available to view after approximately 24 hours</p>
          </div>
        </div>

        <SectionLabel>Refund Status Message</SectionLabel>
        <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
          {[
          { status: "Return Received", desc: "Documents have been received", dot: "var(--ink-faint)" },
          { status: "Being Processed", desc: "Documents are being reviewed/processed", dot: "var(--ochre)" },
          { status: "Refund Approved", desc: "Your refund has been approved", dot: "var(--moss)" },
          { status: "Refund Sent", desc: "Refund sent (deposit within 1-5 days)", dot: "var(--moss)" }].
          map((item) =>
          <div
            key={item.status}
            className="flex items-center gap-3 py-3"
            style={{ borderBottom: "1px solid var(--rule-light)" }}>
            
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.dot }} />
              <div>
                <p className="font-[family-name:var(--font-mono)] text-[12.5px] font-medium" style={{ color: "var(--ink)" }}>
                  {item.status}
                </p>
                <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>{item.desc}</p>
              </div>
            </div>
          )}
        </div>

        <SectionLabel>State Tax Refund Tracking</SectionLabel>
        <Prose>
          <p>
            on google <strong>“Where’s my [state name] refund”</strong>You can find your state's refund inquiry page by searching .
          </p>
        </Prose>
        <ul className="mt-3 space-y-2 text-[14px]" style={{ color: "var(--ink-light)" }}>
          <li className="flex items-baseline gap-3">
            <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
            Required information: SSN, Tax Year, Refund Amount
          </li>
          <li className="flex items-baseline gap-3">
            <span className="w-1 h-1 rounded-full shrink-0 translate-y-[-2px]" style={{ background: "var(--ink-faint)" }} />
            It takes approximately 4 to 6 weeks after documents arrive.
          </li>
        </ul>

        <SectionLabel>common mistakes</SectionLabel>
        <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
          {[
          ...(isResident ?
          [
          {
            mistake: "Not reporting worldwide income",
            fix: "You must report all your worldwide income (including Korean income)"
          },
          {
            mistake: "FBAR not submitted",
            fix: "Must be submitted if total overseas financial accounts exceed $10,000 — $10,000+ fine"
          },
          {
            mistake: "Form 8938 (FATCA) not submitted",
            fix: "If overseas financial assets exceed the threshold, submission with 1040 is required."
          },
          {
            mistake: "Missing PFIC reporting",
            fix: "Korean funds/ETFs are PFIC — penalty + unfavorable taxation for failure to file Form 8621"
          },
          {
            mistake: "FTC/FEIE overlapping application",
            fix: "You cannot apply FTC and FEIE simultaneously to the same income"
          }] :

          isH1BLike ?
          [
          {
            mistake: `${isL1 ? "L-1" : "H-1B"} It is an RA and reported using NRA software (Sprintax)`,
            fix: "RA uses general software such as TurboTax and H&R Block"
          },
          {
            mistake: "Not reporting worldwide income",
            fix: "RAs must report worldwide income (including Korean income)"
          },
          {
            mistake: "FICA refund incorrectly applied for",
            fix: `${isL1 ? "L-1" : "H-1B"}Are not exempt from FICA — applying incorrectly can cause problems`
          },
          ...(isL1 ? [
          {
            mistake: "Totalization Agreement (Social Security Agreement) not confirmed",
            fix: "Expatriates dispatched to Korea can be exempted from FICA with a certificate of application - double payment if not confirmed"
          },
          {
            mistake: "FBAR/Form 8938 not submitted",
            fix: "FBAR is required for RA if the combined foreign financial accounts exceed $10,000 — confirmed from the first year of arrival."
          }] :
          [])] :

          [
          {
            mistake: "I am NRA and report it with TurboTax.",
            fix: "NRA must use Sprintax or GLACIER Tax Prep"
          },
          {
            mistake: "Missing submission of Form 8843",
            fix: "Even if you have no income, you must submit it if you are an NRA (spouse and children each)"
          },
          {
            mistake: "Not claiming tax treaty benefits",
            fix: `Treaty in 1040-NR ${visa ? visa.treatyArticle : ""} Be sure to fill in the benefits`
          }]),


          ...(!isResident ? [
          {
            mistake: "Send federal and state taxes in the same envelope",
            fix: "Be sure to send each in a separate envelope and to a separate address."
          },
          {
            mistake: "Ship to IRS via UPS/FedEx",
            fix: "The IRS address is P.O. Box — only USPS delivery available"
          }] :
          [])].
          map((item, i) =>
          <div
            key={i}
            className="py-3.5"
            style={{ borderBottom: "1px solid var(--rule-light)" }}>
            
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
          )}
        </div>

        <SectionLabel>What if a problem arises?</SectionLabel>
        <div className="space-y-3 text-[14px]" style={{ color: "var(--ink-light)" }}>
          <p>
            <strong>If you are unable to view for more than 6 weeks:</strong> Consider sending the documents again. When sending it back, 
            <Code>Duplicate</Code>Please mark and briefly note the reason for resending.
          </p>
          <p>
            <strong>Contact the IRS by phone:</strong>{" "}
            <span className="font-[family-name:var(--font-mono)]">1-800-829-1040</span>{" "}
            (Information “nonresident for tax purposes” when calling)
          </p>
          <p>
            <strong>When resending:</strong> USPS Priority Mail highly recommended.
          </p>
        </div>

        <Callout type="warn" label="Beware of scams">
          The IRS <strong>never</strong> We will not ask you to purchase gift cards or send money by phone, email, or text. If you receive a suspicious communication, ignore it and never provide personal information (SSN, banking information) to strangers.
        
        </Callout>

        {/* Resident reference links */}
        {isResident &&
        <>
            <SectionLabel>Collection of reference links</SectionLabel>
            <div className="space-y-0" style={{ borderTop: "1px solid var(--rule-light)" }}>
              {RESIDENT_REFERENCE_LINKS.map((link) =>
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-0.5 py-3 transition-colors"
              style={{ borderBottom: "1px solid var(--rule-light)", textDecoration: "none" }}>
              
                  <span className="text-[14px] font-medium" style={{ color: "var(--accent)" }}>
                    {link.label}
                  </span>
                  <span className="text-[12px]" style={{ color: "var(--ink-faint)" }}>
                    {link.desc}
                  </span>
                </a>
            )}
            </div>
          </>
        }

        {/* Completion */}
        <div
          className="mt-10 py-10 px-6 text-center"
          style={{ background: "var(--ink)", borderRadius: 2 }}>
          
          <p
            className="font-[family-name:var(--font-serif)] text-[clamp(20px,3.5vw,28px)] font-black"
            style={{ color: "var(--paper)" }}>
            
            Thank you for your effort
          </p>
          <p className="text-[14px] mt-3 leading-relaxed" style={{ color: "var(--ink-faint)" }}>
            If you follow this guide step by step, you will
            <br />
            You can successfully complete your tax return.
          </p>
          <div
            className="w-12 h-[2px] mx-auto mt-5"
            style={{ background: "var(--accent)" }} />
          
        </div>

        {/* Contact & Credit */}
        <SectionLabel>Other inquiries</SectionLabel>
        <Prose>
          <p>
            For guide-related inquiries or error reports, please send them to the email address below.
          </p>
        </Prose>
        <div
          className="mt-4 p-5"
          style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 2 }}>
          
          <p className="font-[family-name:var(--font-mono)] text-[14px]" style={{ color: "var(--ink)" }}>
            <a href="mailto:gmlcks00513@gmail.com" style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 3 }}>
              gmlcks00513@gmail.com
            </a>
          </p>
        </div>

        <div
          className="mt-8 pt-6 pb-2 text-center"
          style={{ borderTop: "1px solid var(--rule-light)" }}>
          
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-wide" style={{ color: "var(--ink-faint)" }}>
            Developed by{" "}
            <a
              href="https://www.instagram.com/dev_seochan/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--ink-muted)", textDecoration: "underline", textUnderlineOffset: 3 }}>
              
              Seochan
            </a>
          </p>
        </div>
      </>);

  }

  /* ==============================================================
     SHARED — SearchModal
     ============================================================== */

  function SearchModal({ onClose }: {onClose: () => void;}) {
    const [query, setQuery] = useState("");
    const [activeIdx, setActiveIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const results = query.trim().length > 0 ?
    SEARCH_INDEX.filter((entry) => {
      const q = query.toLowerCase();
      return (
        entry.term.toLowerCase().includes(q) ||
        entry.termKo.includes(q) ||
        entry.desc.toLowerCase().includes(q) ||
        entry.keywords.some((k) => k.toLowerCase().includes(q)));

    }) :
    [];

    useEffect(() => {inputRef.current?.focus();}, []);
    useEffect(() => {setActiveIdx(0);}, [query]);

    // Body scroll lock
    useEffect(() => {
      document.body.style.overflow = "hidden";
      return () => {document.body.style.overflow = "";};
    }, []);

    // Scroll active item into view
    useEffect(() => {
      if (!resultsRef.current) return;
      const btns = resultsRef.current.querySelectorAll("button");
      btns[activeIdx]?.scrollIntoView({ block: "nearest" });
    }, [activeIdx]);

    const handleSelect = (entry: SearchEntry) => {
      onClose();
      goTo(entry.step);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {onClose();return;}
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % Math.max(results.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1));
      } else if (e.key === "Enter" && results[activeIdx]) {
        e.preventDefault();
        handleSelect(results[activeIdx]);
      }
    };

    return createPortal(
      <div className="search-overlay" onClick={onClose}>
        <div className="search-modal" onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
          <div className="search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for tax terms (e.g. FBAR, tax treaty, refund)"
              value={query}
              onChange={(e) => setQuery(e.target.value)} />
            
            <span className="search-esc-badge">ESC</span>
          </div>
          <div className="search-results" ref={resultsRef}>
            {query.trim().length > 0 && results.length === 0 &&
            <div className="search-empty">No search results</div>
            }
            {results.map((entry, i) =>
            <button
              key={`${entry.term}-${entry.step}`}
              className={i === activeIdx ? "search-active" : ""}
              onClick={() => handleSelect(entry)}>
              
                <span className="search-step-badge">
                  {String(entry.step + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>
                    {entry.term}
                  </span>
                  {entry.termKo &&
                <span className="text-[12px] ml-1.5" style={{ color: "var(--ink-muted)" }}>
                      {entry.termKo}
                    </span>
                }
                  <span className="block text-[12px] mt-0.5" style={{ color: "var(--ink-faint)" }}>
                    {entry.desc}
                  </span>
                </span>
              </button>
            )}
            {query.trim().length === 0 &&
            <div className="search-empty" style={{ color: "var(--ink-faint)" }}>
                Enter a keyword to jump straight to the relevant step
              </div>
            }
          </div>
        </div>
      </div>,
      document.body
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
          style={{ color: "var(--ink)" }}>
          
          Please select your visa or status first
        </p>
        <p className="text-[15px] mb-6" style={{ color: "var(--ink-muted)" }}>
          If you select your visa or status in Step 01,
          <br />
          A personalized guide will appear.
        </p>
        <button
          onClick={() => goTo(0)}
          className="font-[family-name:var(--font-mono)] text-[13px] font-bold px-5 py-2.5 transition-colors"
          style={{
            background: "var(--ink)",
            color: "var(--paper)",
            borderRadius: 4,
            cursor: "pointer",
            border: "none"
          }}>
          
          Go to Step 01
        </button>
      </div>);

  }
}
