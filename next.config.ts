import type { NextConfig } from "next";

/*
 * Tuned for Hugging Face Spaces (Docker SDK) and self-hosting:
 *  - Runs behind the Space reverse proxy, so no host/origin allowlist is set;
 *    requests for the *.hf.space domain are accepted as-is.
 *  - Search thumbnails are plain <img> tags pointing at many third-party hosts,
 *    so the image optimizer stays out of the way (works without sharp).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
