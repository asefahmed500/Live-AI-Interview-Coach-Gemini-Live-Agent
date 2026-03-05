export default () => ({
  port: parseInt(process.env.API_PORT || '3001', 10),
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/live-interview-coach',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiration: process.env.JWT_EXPIRATION || '7d',
  },
  web: {
    url: process.env.WEB_URL || 'http://localhost:3000',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
});
