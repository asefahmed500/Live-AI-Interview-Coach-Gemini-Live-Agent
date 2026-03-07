# Better Auth Migration Guide

## Overview

This document describes the migration from the custom JWT-based authentication system to **Better Auth** - a modern, framework-agnostic authentication library.

## What Was Done

### Backend (NestJS API)

1. **Dependencies Installed**:
   - `better-auth` - Core Better Auth library
   - `@thallesp/nestjs-better-auth` - Community NestJS integration

2. **Files Created**:
   - `apps/api/src/lib/better-auth.ts` - Better Auth configuration with MongoDB adapter
   - `apps/api/src/modules/better-auth/better-auth.module.ts` - NestJS module
   - `apps/api/src/modules/better-auth/better-auth.controller.ts` - Auth endpoint handler
   - `apps/api/src/common/guards/better-auth.guard.ts` - WebSocket authentication guard

3. **Files Modified**:
   - `apps/api/src/app.module.ts` - Added BetterAuthModule import
   - `.env.example` - Added BETTER_AUTH_SECRET and BETTER_AUTH_URL variables

### Frontend (Next.js)

1. **Dependencies Installed**:
   - `better-auth` - Core Better Auth library (includes React client)

2. **Files Created**:
   - `apps/web/src/lib/better-auth-client.ts` - Auth client configuration
   - `apps/web/src/store/use-better-auth-store.ts` - Zustand store for Better Auth
   - `apps/web/src/components/auth/better-auth-form.tsx` - New auth form component

## What Needs to Be Completed

### Phase 1: Backend Integration

1. **Fix Better Auth Configuration**:
   ```typescript
   // apps/api/src/lib/better-auth.ts
   // The MongoDB adapter needs proper connection handling
   // Currently using mongoose.connection.asPromise() which may not work correctly
   ```

   **Solution**: Use a proper MongoDB client instance:
   ```typescript
   import { MongoClient } from 'mongodb';
   import { mongodbAdapter } from "better-auth/adapters/mongodb";

   const uri = process.env.MONGODB_URI!;
   const client = new MongoClient(uri);
   const db = client.db();

   export const auth = betterAuth({
     database: mongodbAdapter(db, { client }),
     // ... rest of config
   });
   ```

2. **Update WebSocket Authentication**:
   - Modify `apps/api/src/modules/websocket/websocket.gateway.ts` to use `BetterAuthGuard`
   - Update session token extraction logic to work with Better Auth cookies

3. **Remove Old JWT Auth (After Migration Works)**:
   - Remove or deprecate `apps/api/src/modules/auth/` endpoints
   - Remove `@nestjs/jwt` and `passport-jwt` dependencies
   - Update all services using `AuthGuard` to use `BetterAuthGuard`

### Phase 2: Frontend Integration

1. **Update Auth Pages**:
   ```typescript
   // apps/web/src/app/auth/page.tsx
   // Replace AuthForm with BetterAuthForm
   import { BetterAuthForm } from '@/components/auth/better-auth-form';

   export default function AuthPage() {
     return <BetterAuthForm />;
   }
   ```

2. **Update Dashboard to Use Better Auth Session**:
   ```typescript
   // apps/web/src/app/dashboard/page.tsx
   // Use the Better Auth session hook
   import { useBetterAuthStore } from '@/store/use-better-auth-store';
   import { useBetterAuthInit } from '@/store/use-better-auth-store';

   export default function DashboardPage() {
     const { isAuthenticated, user } = useBetterAuthStore();
     const { init } = useBetterAuthInit();

     useEffect(() => {
       init();
     }, []);

     if (!isAuthenticated) {
       redirect('/auth');
     }

     return <div>Welcome, {user?.name}</div>;
   }
   ```

3. **Update WebSocket Connection**:
   ```typescript
   // apps/web/src/lib/websocket.ts
   // Update to include Better Auth cookies
   const socket = io(WS_URL, {
     withCredentials: true, // Important for cookies
   });
   ```

4. **Remove Old Auth State**:
   - Delete `apps/web/src/store/use-auth-store.ts` (old JWT store)
   - Delete `apps/web/src/lib/auth-api.ts` (old API client)
   - Delete `apps/web/src/components/auth/auth-form.tsx` (old form)

### Phase 3: Environment Variables

Add to `apps/api/.env`:
```bash
# Better Auth Configuration
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:3001
```

To generate a secure secret:
```bash
# On Windows
powershell -Command "ConvertTo-SecureString -AsPlainText (New-Guid).Guid -Force | ConvertFrom-SecureString"

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Phase 4: Testing

1. **Test Registration**:
   - Sign up a new user via Better Auth
   - Verify user is created in MongoDB

2. **Test Login**:
   - Sign in with the new user
   - Verify session cookie is set

3. **Test Protected Routes**:
   - Access `/api/auth/get-session` endpoint
   - Verify session is returned

4. **Test WebSocket**:
   - Connect to `/live` namespace with auth
   - Verify session is validated

## Better Auth Endpoints

Better Auth provides these endpoints automatically:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/sign-up/email` | Register with email/password |
| POST | `/api/auth/sign-in/email` | Sign in with email/password |
| POST | `/api/auth/sign-out` | Sign out |
| GET | `/api/auth/get-session` | Get current session |
| POST | `/api/auth/forgot-password` | Initiate password reset |
| POST | `/api/auth/reset-password` | Complete password reset |

## Migration Checklist

- [x] Install better-auth packages
- [x] Create Better Auth configuration
- [x] Create Better Auth module and controller
- [x] Update app.module.ts
- [x] Create frontend auth client
- [x] Create frontend auth store
- [x] Create new auth form component
- [x] Update .env.example
- [ ] Fix MongoDB adapter configuration
- [ ] Update WebSocket gateway authentication
- [ ] Update auth page to use BetterAuthForm
- [ ] Update dashboard to use Better Auth session
- [ ] Update WebSocket client to include credentials
- [ ] Test registration flow
- [ ] Test login flow
- [ ] Test session persistence
- [ ] Test WebSocket authentication
- [ ] Remove old JWT code (after everything works)

## Important Notes

1. **Cookie-Based Sessions**: Better Auth uses session cookies by default, not JWT tokens. This is more secure and simpler to manage.

2. **MongoDB Adapter**: The MongoDB adapter for Better Auth is different from Mongoose. It creates its own collections (`user`, `session`, etc.).

3. **Existing Users**: If you have existing users in your Mongoose `users` collection, you'll need to migrate them to Better Auth's format.

4. **WebSocket Auth**: WebSocket authentication needs to handle cookies differently. Use `withCredentials: true` on the client side.

5. **CORS**: Ensure CORS is configured correctly for cookie handling:
   ```typescript
   app.enableCors({
     origin: allowedOrigins,
     credentials: true,
   });
   ```

## Troubleshooting

### Issue: "MongoDB adapter not working"
**Solution**: Ensure you're passing a proper MongoDB client instance, not Mongoose.

### Issue: "Session not persisting"
**Solution**: Check that `credentials: 'include'` is set in fetch calls and `withCredentials: true` for WebSocket.

### Issue: "CORS errors with cookies"
**Solution**: Verify that the origin is in the `CORS_ORIGINS` list and `credentials: true` is set.

### Issue: "WebSocket authentication failing"
**Solution**: The Better Auth session cookie needs to be extracted from the WebSocket handshake. Check `better-auth.guard.ts` implementation.

## References

- Better Auth Docs: https://www.better-auth.com/docs
- MongoDB Adapter: https://www.better-auth.com/docs/adapters/mongo
- NestJS Integration: https://www.better-auth.com/docs/integrations/nestjs
- React Client: https://www.better-auth.com/docs/concepts/client
