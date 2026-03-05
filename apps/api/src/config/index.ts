import { registerAs } from '@nestjs/config';

export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  api: {
    port: parseInt(process.env.API_PORT || '3001', 10),
    host: process.env.API_HOST || '0.0.0.0',
    prefix: process.env.API_PREFIX || 'api',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/live-interview-coach',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    expiration: process.env.JWT_EXPIRATION || '7d',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
  web: {
    url: process.env.WEB_URL || 'http://localhost:3000',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
});

// Named configuration exports
export const apiConfig = registerAs('api', () => ({
  port: parseInt(process.env.API_PORT || '3001', 10),
  host: process.env.API_HOST || '0.0.0.0',
  prefix: process.env.API_PREFIX || 'api',
}));

export const mongoConfig = registerAs('mongodb', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/live-interview-coach',
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
  expiration: process.env.JWT_EXPIRATION || '7d',
}));

export const corsConfig = registerAs('cors', () => ({
  origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
}));

export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
}));

export const loggingConfig = registerAs('logging', () => ({
  level: process.env.LOG_LEVEL || 'info',
}));
