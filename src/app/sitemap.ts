import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://us-tax-lovat.vercel.app";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    // Add hash-based step URLs for better crawlability signals
    ...[
      "시작하기",
      "거주자-상태",
      "조세조약",
      "서류-준비",
      "연방세",
      "주세",
      "제출",
      "환급-추적",
    ].map((step, i) => ({
      url: `${baseUrl}/#step-${i}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
