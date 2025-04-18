/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Env vars que Vercel inyectará en build + runtime
  env: {
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID,
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
    AZURE_SUBSCRIPTION_ID: process.env.AZURE_SUBSCRIPTION_ID,
  },

  // Permitir que Jira (.atlassian.net) coloque la app en un iframe
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.atlassian.net;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
