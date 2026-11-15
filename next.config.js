/** @type {import('next').NextConfig} */

// The radio used to be served with cross-origin isolation headers (COOP/COEP).
// Nothing in the code uses SharedArrayBuffer, and those headers block Stripe,
// YouTube and GitHub embeds. Now that the radio plays across the whole site
// they would have had to go everywhere, so they're gone instead.

const nextConfig = {
  // A link we own for "support the patch". Plugins, apps and READMEs point
  // here, so the destination can change without touching them. Temporary
  // (307) on purpose, so browsers don't cache it forever.
  async redirects() {
    return [
      { source: '/support', destination: 'https://github.com/sponsors/betweentwomidnights', permanent: false },
    ];
  },
};

module.exports = nextConfig;
