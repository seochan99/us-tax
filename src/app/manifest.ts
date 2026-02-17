import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "미국 세금 가이드 — 비자별·신분별 맞춤 안내서",
    short_name: "미국 세금 가이드",
    description:
      "한국인을 위한 미국 세금 신고 단계별 가이드. F-1, J-1, H-1B, 영주권자, 시민권자 대상.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#2563eb",
    lang: "ko",
    categories: ["finance", "education"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
