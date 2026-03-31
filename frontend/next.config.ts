import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

function resolveBackendOrigin(): string {
  const explicit = process.env.BACKEND_PROXY_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const pub = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (pub) {
    if (pub.endsWith("/api")) return pub.slice(0, -"/api".length);
    return pub;
  }
  return "http://127.0.0.1:4000";
}

const backendOrigin = resolveBackendOrigin();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "https", hostname: "**.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "*.googleusercontent.com", pathname: "/**" },
    ],
  },
  /** Same-origin proxy when NEXT_PUBLIC_API_URL is unset — avoids CORS & localhost/127 mismatch */
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
