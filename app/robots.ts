import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/dashboard", "/oauth-callback", "/api/"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://inview.magbyte.biz"}/sitemap.xml`,
  };
}
