# 미국 세금 가이드

한국인을 위한 미국 세금 신고 단계별 가이드. 비자 유형에 따라 맞춤 안내를 제공합니다.

**[us-tax-lovat.vercel.app](https://us-tax-lovat.vercel.app)**

## 지원 비자

| 비자 | 대상 | 조세조약 |
|------|------|----------|
| F-1 | 유학생 | Art. 21(1) — 장학금 면세, $2,000 면세 |
| J-1 Researcher | 연구원/교수 | Art. 20(1) — 소득 전액 면세 (최대 2년) |
| J-1 Student | 교환학생 | Art. 21(1) — 장학금 면세, $2,000 면세 |
| H-1B | 취업비자 | Art. 4 — Resident 판정 시 조약 혜택 제한 |
| 동반비자 | F-2 / J-2 / H-4 | 본인 소득 있을 시 별도 신고 |

## 주요 기능

- 8단계 세금 신고 워크플로우 (시작하기 → 환급 추적)
- 비자별 맞춤 조세조약, 서류 체크리스트, 신고 양식 안내
- 거주자(Resident) / 비거주자(Non-Resident) 판정 가이드
- 연방세 + 주세 신고 방법 안내
- 용어 툴팁 (모바일 탭, 키보드 접근성 지원)
- 진행 상태 localStorage 자동 저장
- 스크롤 반응형 헤더 (스크롤 다운 시 자동 숨김)

## 기술 스택

- **Next.js 16** + React 19 + TypeScript
- **Tailwind CSS 4**
- Noto Sans KR / Source Serif 4 / JetBrains Mono
- Vercel 배포

## 로컬 실행

```bash
npm install
npm run dev
```

[localhost:3000](http://localhost:3000)에서 확인.
