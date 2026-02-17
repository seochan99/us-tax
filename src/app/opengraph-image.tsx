import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "미국 세금 가이드 — 비자별·신분별 맞춤 세금 신고 안내서";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Accent glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Top badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#2563eb",
              fontSize: 22,
              fontWeight: 700,
              color: "white",
            }}
          >
            TX
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            US TAX GUIDE FOR KOREANS
          </div>
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: "white",
            lineHeight: 1.2,
            textAlign: "center",
            maxWidth: 900,
            marginBottom: 16,
          }}
        >
          미국 세금 신고,
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: "#60a5fa",
            lineHeight: 1.2,
            textAlign: "center",
            maxWidth: 900,
            marginBottom: 32,
          }}
        >
          처음이라 막막한 당신을 위해.
        </div>

        {/* Tags */}
        <div
          style={{
            display: "flex",
            gap: 10,
          }}
        >
          {["F-1 유학생", "J-1 연구원", "H-1B 취업", "영주권자", "시민권자"].map(
            (tag) => (
              <div
                key={tag}
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.6)",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "6px 14px",
                  borderRadius: 6,
                }}
              >
                {tag}
              </div>
            )
          )}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            fontSize: 13,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.05em",
          }}
        >
          us-tax-lovat.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
