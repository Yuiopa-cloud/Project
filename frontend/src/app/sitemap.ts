import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const base = "https://atlas-auto.ma";

const routes = ["", "/shop", "/faq", "/contact", "/cart", "/checkout"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of routing.locales) {
    for (const path of routes) {
      entries.push({
        url: `${base}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: path === "" ? 1 : 0.7,
      });
    }
  }
  return entries;
}
