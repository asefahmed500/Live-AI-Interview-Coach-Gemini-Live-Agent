import type { Config } from 'next';

const config: Config = {
  reactStrictMode: true,
  transpilePackages: ['@live-ai-coach/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://live-interview-api-ywh3e45esq-uc.a.run.app',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'wss://live-interview-api-ywh3e45esq-uc.a.run.app',
  },
};

export default config;
