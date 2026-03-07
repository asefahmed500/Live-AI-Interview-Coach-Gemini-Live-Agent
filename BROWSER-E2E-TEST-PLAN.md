# Browser-Based E2E Test Plan

## Quick Start

**Services Status:**
- ✅ API: http://localhost:3001 (Running - PID 3324)
- ✅ Web: http://localhost:3000 (Running - PID 23444)
- ✅ MongoDB: Connected

**Open Browser:** http://localhost:3000

---

## Test 1: Landing Page (`/`)

### Steps
1. Open browser to `http://localhost:3000`
2. Verify hero section loads without flickering
3. Verify all navigation links work
4. Check for console errors (F12 → Console tab)

### Expected Results
- ✅ Hero section visible with "Practice Your Interview Skills" heading
- ✅ No console errors
- ✅ "Sign In" and "Start Practicing" buttons navigate to `/auth`
- ✅ Features section displays correctly
- ✅ Demo dashboard mockup visible
- ✅ Footer loads properly

### DevTools Checks
- **Console:** No red errors
- **Network:** Page loads with 200 status
- **Elements:** DOM structure matches `apps/web/src/app/page.tsx`

---

## Test 2: Authentication Flow (`/auth`)

### 2A. Register New User

1. Navigate to `/auth`
2. Toggle to "Sign up" mode (click "Sign up" link)
3. Fill form:
   - **Name:** `Test User`
   - **Email:** `test@example.com`
   - **Password:** `TestPass123`
   - **Confirm Password:** `TestPass123`
4. Click "Create account"
5. Verify redirect to `/dashboard`

#### Expected Results
- ✅ Form validation works (passwords must match)
- ✅ Email format validation works
- ✅ Password validation works (minimum length)
- ✅ Success redirects to `/dashboard`
- ✅ `auth-storage` in localStorage contains user data and token

#### localStorage Check (F12 → Application → Local Storage)
```json
{
  "state": {
    "user": {
      "id": "...",
      "email": "test@example.com",
      "name": "Test User"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2B. Login Existing User

1. Logout from dashboard (if logged in)
2. Back to `/auth`
3. Fill login form:
   - **Email:** `test@example.com`
   - **Password:** `TestPass123`
4. Click "Continue"
5. Verify redirect to `/dashboard`

#### Expected Results
- ✅ Form accepts valid credentials
- ✅ Invalid credentials show error message
- ✅ Success redirects to `/dashboard`
- ✅ No console errors

### Files Involved
- `apps/web/src/app/auth/page.tsx`
- `apps/web/src/components/auth/auth-form.tsx`
- `apps/web/src/store/use-auth-store.ts`
- `apps/web/src/lib/auth-api.ts`

---

## Test 3: Dashboard & Interview Setup (`/dashboard`)

### Steps
1. After login, verify dashboard loads
2. Fill in job description:
   ```
   Software Engineer at Google. Looking for candidates with React, Node.js, and Python experience.
   ```
3. Select interview mode: `behavioral`
4. Click "Start Interview Session"
5. Verify WebSocket connection established

### Expected Results
- ✅ Dashboard shows interview setup form
- ✅ Job description textarea accepts text
- ✅ Mode selection buttons work (technical/behavioral/mixed)
- ✅ Active mode shows selected state (different background)
- ✅ "Start Interview Session" button changes UI to ready state
- ✅ WebSocket connects to `ws://localhost:3001/live`
- ✅ No console errors

### DevTools Checks
- **Network → WS tab:** Shows WebSocket connection
- **Console:** Look for `[WebSocket] Connected to server`
- **Frames:**
  - `connection_established` event
  - Session state changes

### Files Involved
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/components/interview/interview-area.tsx`
- `apps/web/src/hooks/use-websocket.ts`

---

## Test 4: Camera & Microphone Permissions

### Steps
1. Click "Start Session" button
2. Grant camera permission when prompted
3. Grant microphone permission when prompted
4. Verify camera preview shows
5. Click microphone button to toggle recording
6. Speak into microphone and verify waveform visualizer responds

### Expected Results
- ✅ Browser prompts for camera/microphone permissions
- ✅ Camera preview visible after granting permission
- ✅ Microphone button toggles recording state (Mic icon changes)
- ✅ Waveform visualizer shows audio activity when speaking
- ✅ "Recording audio" indicator appears
- ✅ No console errors

### DevTools Checks
- **Console:** Look for permission logs
- **Network:** WebSocket `start_session` event sent
- **MediaDevices:** `navigator.mediaDevices.getUserMedia` successful

### Files Involved
- `apps/web/src/hooks/use-audio-stream.ts`
- `apps/web/src/hooks/use-camera-analysis.ts`
- `apps/web/src/components/camera/camera-preview.tsx`
- `apps/web/src/components/audio/waveform-visualizer.tsx`

---

## Test 5: AI Interview Session (Full Flow)

### Steps
1. Start session with camera and microphone enabled
2. Wait for AI greeting message
3. Speak: "Hi, I'm a software engineer with 5 years of experience"
4. Wait for AI response
5. Verify transcript updates with user message
6. Verify transcript updates with AI response
7. Continue conversation for 2-3 exchanges
8. Click "Stop" button to end session

### Expected Results
- ✅ AI sends greeting via WebSocket
- ✅ User speech appears in transcript
- ✅ AI responds to user input
- ✅ Text-to-speech speaks AI responses (if enabled)
- ✅ Confidence scores update (if camera enabled)
- ✅ "Streaming" indicator appears during AI responses
- ✅ "Speaking" indicator during text-to-speech
- ✅ Stop button ends session cleanly
- ✅ No console errors

### DevTools Checks
- **Console Logs:**
  ```
  [WebSocket] Session started: {sessionId}
  [WebSocket] Transcript partial: ...
  [WebSocket] AI response: ...
  ```
- **Network → WS → Frames:**
  - `start_session` sent
  - `session_started` received
  - `audio_chunk` sent
  - `ai_response` received
  - `confidence_update` received (if camera enabled)

### Files Involved
- `apps/web/src/hooks/use-ai-streaming.ts`
- `apps/web/src/components/chat/streaming-message.tsx`
- `apps/web/src/components/chat/user-message.tsx`

---

## Test 6: Session Persistence & Reconnect

### Steps
1. Start a session
2. Refresh the page (F5)
3. Verify authentication persists (still logged in)
4. Verify UI recovers to idle state
5. Check localStorage still has valid token

### Expected Results
- ✅ User stays authenticated after refresh
- ✅ UI recovers to interview setup state
- ✅ WebSocket reconnects automatically
- ✅ No stale states or errors

### DevTools Checks
- **Application → Local Storage:** `auth-storage` still present
- **Console:** Reconnection logs

### Files Involved
- `apps/web/src/store/use-auth-store.ts` (persist middleware)
- `apps/web/src/store/use-interview-store.ts` (persist middleware)

---

## Browser DevTools Checklist

### Console Tab
- ❌ No red errors
- ⚠️ No yellow warnings (except maybe deprecation warnings from libraries)

### Network Tab
- ✅ API calls to `http://localhost:3001/api/*` return 200/201
- ✅ WebSocket connection shows `101 Switching Protocols`
- ✅ Static assets load successfully

### WebSocket Frames (WS tab)
- ✅ `connection_established`
- ✅ `session_started`
- ✅ `ai_response`
- ✅ `confidence_update` (if camera enabled)

### Application Tab → Local Storage
- ✅ `auth-storage` key exists with valid JSON
- ✅ Contains `user`, `token`, `isAuthenticated: true`

---

## Known Issues to Watch

### 1. JWT userId placeholder
Sessions may show `userId: "000000000000000000000000"` - this is a known backend issue but doesn't affect frontend flow.

### 2. Camera permissions
If camera fails:
- Ensure no other app is using the camera
- Check browser has permission granted
- Try HTTPS if using localhost (should work on localhost anyway)

### 3. WebSocket reconnection
If WebSocket disconnects:
- Check API is still running on port 3001
- Check browser console for connection errors
- Refresh page to reconnect

### 4. CORS issues
If you see CORS errors:
- Check `apps/api/.env` has correct `CORS_ORIGINS`
- Should include `http://localhost:3000`

---

## Success Criteria Checklist

### Landing Page
- [ ] Page loads without errors
- [ ] Hero section visible
- [ ] Navigation links work
- [ ] No console errors

### Authentication
- [ ] Can register new account
- [ ] Can login with existing account
- [ ] Form validation works
- [ ] Redirect to dashboard after successful auth
- [ ] localStorage has auth data

### Dashboard
- [ ] Dashboard loads after authentication
- [ ] Job description input works
- [ ] Interview mode selection works
- [ ] Start button changes UI state

### Permissions
- [ ] Camera permission can be granted
- [ ] Microphone permission can be granted
- [ ] Camera preview displays video feed

### Audio/Video
- [ ] Waveform visualizer responds to audio
- [ ] Camera preview shows live video
- [ ] Microphone toggle works

### WebSocket
- [ ] WebSocket connects successfully
- [ ] Session start event received
- [ ] Can send audio chunks

### AI Session
- [ ] AI sends greeting message
- [ ] User speech appears in transcript
- [ ] AI responds to user input
- [ ] Session can be stopped cleanly

### Persistence
- [ ] Authentication persists across refresh
- [ ] No stale states after refresh
- [ ] No console errors throughout flow

---

## Quick Test Commands

```bash
# Check if services are running
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# In separate terminals (if not running):

# Terminal 1: Start API
cd /d/laic/apps/api
npx ts-node src/main.ts

# Terminal 2: Start Web
cd /d/laic/apps/web
pnpm dev
```

---

## Test User Credentials (for testing)

**Register New User:**
- Email: `test@example.com`
- Password: `TestPass123`
- Name: `Test User`

Or use any email/password that meets:
- Password minimum 8 characters
- Valid email format

---

## Troubleshooting

### Port 3000 already in use
```bash
netstat -ano | findstr :3000
taskkill //PID <pid> //F
```

### Port 3001 already in use
```bash
netstat -ano | findstr :3001
taskkill //PID <pid> //F
```

### Clear localStorage (F12 → Console)
```javascript
localStorage.clear()
```

### Check WebSocket connection (F12 → Console)
```javascript
// WebSocket should be connected to ws://localhost:3001/live
// Check for connection logs
```

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `apps/web/src/app/page.tsx` | Landing page |
| `apps/web/src/app/auth/page.tsx` | Auth page wrapper |
| `apps/web/src/components/auth/auth-form.tsx` | Login/register form |
| `apps/web/src/app/dashboard/page.tsx` | Dashboard & interview entry |
| `apps/web/src/components/interview/interview-area.tsx` | Main interview UI |
| `apps/web/src/hooks/use-websocket.ts` | WebSocket connection |
| `apps/web/src/hooks/use-audio-stream.ts` | Microphone handling |
| `apps/web/src/hooks/use-camera-analysis.ts` | Camera handling |
| `apps/web/src/store/use-auth-store.ts` | Auth state with persistence |
| `apps/web/src/store/use-interview-store.ts` | Interview state |
| `apps/web/src/lib/api-client.ts` | API client with JWT |
| `apps/web/src/lib/websocket-client.ts` | WebSocket client with reconnection |
