import type { NextConfig } from "next";

/**
 * Share pages carry a bearer token in the URL. `no-referrer` keeps it
 * from leaking via the Referer header when a viewer follows an external
 * link inside lesson Markdown; `noindex` keeps shared courses out of
 * search engines even if a link is posted publicly.
 */
const shareHeaders = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/share/:path*", headers: shareHeaders },
      { source: "/api/share/:path*", headers: shareHeaders },
    ];
  },
};

export default nextConfig;
