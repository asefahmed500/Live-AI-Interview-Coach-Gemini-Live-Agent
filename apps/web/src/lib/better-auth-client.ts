/**
 * Better Auth Client Configuration
 *
 * This creates the auth client instance for the frontend.
 * It communicates with the Better Auth backend at the API URL.
 */

import { createAuthClient } from "better-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Better Auth Client
 *
 * Use this client to interact with authentication features:
 * - signIn.email() - Sign in with email and password
 * - signUp.email() - Sign up with email and password
 * - signOut() - Sign out
 * - useSession() - Get session data (React hook)
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
});

/**
 * Type exports for use in components
 */
export type Session = typeof authClient.$Infer.Session;
