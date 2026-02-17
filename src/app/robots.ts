import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: "Googlebot",
        allow: "/",
      },
      {
        userAgent: "Yeti",  // Naver
        allow: "/",
      },
      {
        userAgent: "Daum",
        allow: "/",
      },
    ],
    sitemap: "https://us-tax-lovat.vercel.app/sitemap.xml",
    host: "https://us-tax-lovat.vercel.app",
  };
}
