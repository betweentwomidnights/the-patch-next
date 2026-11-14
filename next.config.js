/** @type {import('next').NextConfig} */

// Cross-origin isolation for the radio dashboard only. These headers block
// cross-origin embeds (Stripe, YouTube, GitHub images), so no other page
// should get them.
const crossOriginIsolation = [
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig = {
  // A link we own for "support the patch". Plugins, apps and READMEs point
  // here, so the destination can change without touching them. Temporary
  // (307) on purpose, so browsers don't cache it forever.
  async redirects() {
    return [
      { source: '/support', destination: 'https://github.com/sponsors/betweentwomidnights', permanent: false },
    ];
  },
  async headers() {
    return [
      { source: '/radio', headers: crossOriginIsolation },
    ];
  },
};

module.exports = nextConfig;
