import { cookies, headers } from "next/headers";

import TaxGuide from "@/components/TaxGuide";

export default async function Home() {
  const cookieStore = await cookies();
  const savedLanguage = cookieStore.get("taxguide_lang")?.value;

  let initialLanguage: "ko" | "en";
  if (savedLanguage === "ko" || savedLanguage === "en") {
    initialLanguage = savedLanguage;
  } else {
    const acceptLanguage = (await headers()).get("accept-language")?.toLowerCase() ?? "";
    initialLanguage = acceptLanguage.includes("ko") ? "ko" : "en";
  }

  return <TaxGuide initialLanguage={initialLanguage} />;
}
