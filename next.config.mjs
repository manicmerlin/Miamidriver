/** @type {import('next').NextConfig} */

// Build the next/image allowlist from env so we don't have to redeploy when
// you switch storage providers. Defaults cover fal.ai's CDN + the common
// adult-friendly object stores; S3_PUBLIC_URL is added when set.
function buildRemotePatterns() {
  const fixed = [
    { protocol: "https", hostname: "fal.media" },                  // fal.ai outputs
    { protocol: "https", hostname: "v2.fal.media" },               // fal.ai v2
    { protocol: "https", hostname: "*.fal.media" },                // fal.ai shards
    { protocol: "https", hostname: "*.s3.wasabisys.com" },         // Wasabi
    { protocol: "https", hostname: "*.b-cdn.net" },                // Bunny CDN
    { protocol: "https", hostname: "*.backblazeb2.com" },          // B2
    { protocol: "https", hostname: "*.digitaloceanspaces.com" },   // DO Spaces
    { protocol: "https", hostname: "replicate.delivery" },         // Replicate
  ];

  const publicUrl = process.env.S3_PUBLIC_URL;
  if (publicUrl) {
    try {
      const u = new URL(publicUrl);
      fixed.push({ protocol: u.protocol.replace(":", ""), hostname: u.hostname });
    } catch {
      // ignore malformed S3_PUBLIC_URL
    }
  }
  return fixed;
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: buildRemotePatterns(),
  },
};

export default nextConfig;
