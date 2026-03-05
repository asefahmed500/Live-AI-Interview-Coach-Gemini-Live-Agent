import type { Config } from 'next';

const config: Config = {
  reactStrictMode: true,
  transpilePackages: ['@live-ai-coach/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: process.env.WS_URL || 'ws://localhost:3001',
  },
};

export default config;
