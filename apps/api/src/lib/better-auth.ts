import { betterAuth } from "better-auth";

/**
 * Better Auth Configuration
 *
 * This provides the core authentication instance for the application.
 * Better Auth handles user management, sessions, and authentication.
 */
export const auth = betterAuth({
  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Skip for hackathon/demo purposes
    sendResetPasswordUrl: async ({ url, user }) => {
      // In production, this would send an email
      console.log('Password reset URL:', url);
      console.log('For user:', user.email);
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
    modelName: 'session',
  },

  // Advanced configuration
  advanced: {
    cookiePrefix: "laic",
    useSecureCookies: process.env.NODE_ENV === 'production',
    crossSubDomainCookies: {
      enabled: false,
    },
  },

  // Base URL for the application
  baseURL: process.env.BETTER_AUTH_URL || process.env.API_URL || 'http://localhost:3001',

  // User schema fields
  user: {
    additionalFields: {
      name: {
        type: "string",
        required: true,
      },
      role: {
        type: "string",
        defaultValue: "user",
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
      },
    },
    modelName: 'user',
  },
});

/**
 * Export types for use in the application
 */
export type Session = typeof auth.$Infer.Session;
