# API Documentation

## Base URL

```
http://localhost:3001
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Sessions

#### List Sessions

```http
GET /sessions
Authorization: Bearer <token>
```

Response:
```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "title": "Technical Interview Practice",
      "status": "completed",
      "startedAt": "2024-01-15T10:00:00Z",
      "completedAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-15T09:55:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:01Z"
}
```

#### Create Session

```http
POST /sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Technical Interview Practice"
}
```

Response:
```json
{
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "title": "Technical Interview Practice",
    "status": "idle",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "timestamp": "2024-01-15T10:00:01Z"
}
```

#### Get Session

```http
GET /sessions/:id
Authorization: Bearer <token>
```

Response:
```json
{
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "title": "Technical Interview Practice",
    "status": "active",
    "startedAt": "2024-01-15T10:05:00Z",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:05:00Z"
  },
  "timestamp": "2024-01-15T10:05:01Z"
}
```

#### Update Session

```http
PUT /sessions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "active"
}
```

Response:
```json
{
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "status": "active",
    "startedAt": "2024-01-15T10:05:00Z",
    "updatedAt": "2024-01-15T10:05:00Z"
  },
  "timestamp": "2024-01-15T10:05:01Z"
}
```

#### Delete Session

```http
DELETE /sessions/:id
Authorization: Bearer <token>
```

Response:
```json
{
  "data": {
    "id": "507f1f77bcf86cd799439011"
  },
  "timestamp": "2024-01-15T10:10:01Z"
}
```

### Feedback

#### List Feedback

```http
GET /feedback
Authorization: Bearer <token>
```

Response:
```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439020",
      "sessionId": "507f1f77bcf86cd799439011",
      "type": "confidence",
      "score": 8,
      "message": "Good confidence level throughout",
      "suggestions": [
        "Maintain eye contact",
        "Speak slightly slower"
      ],
      "createdAt": "2024-01-15T10:15:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:15:01Z"
}
```

#### Get Feedback

```http
GET /feedback/:id
Authorization: Bearer <token>
```

Response:
```json
{
  "data": {
    "id": "507f1f77bcf86cd799439020",
    "sessionId": "507f1f77bcf86cd799439011",
    "type": "speech",
    "score": 7,
    "message": "Clear articulation with minor filler words",
    "suggestions": [
      "Reduce use of 'um' and 'uh'",
      "Practice pausing instead of fillers"
    ],
    "createdAt": "2024-01-15T10:15:00Z"
  },
  "timestamp": "2024-01-15T10:15:01Z"
}
```

## WebSocket Events

### Connection

```
ws://localhost:3001
```

### Client → Server Events

#### Join Session
```json
{
  "event": "join_session",
  "data": {
    "sessionId": "507f1f77bcf86cd799439011"
  }
}
```

#### Leave Session
```json
{
  "event": "leave_session",
  "data": {
    "sessionId": "507f1f77bcf86cd799439011"
  }
}
```

#### Start Session
```json
{
  "event": "start_session"
}
```

#### Pause Session
```json
{
  "event": "pause_session"
}
```

#### Resume Session
```json
{
  "event": "resume_session"
}
```

#### End Session
```json
{
  "event": "end_session"
}
```

#### Send Message
```json
{
  "event": "send_message",
  "data": {
    "message": "Tell me about yourself"
  }
}
```

### Server → Client Events

#### Session Started
```json
{
  "event": "session_started",
  "data": {
    "sessionId": "507f1f77bcf86cd799439011",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

#### Message Received
```json
{
  "event": "message_received",
  "data": {
    "role": "assistant",
    "content": "Thank you for that question...",
    "timestamp": "2024-01-15T10:00:05Z"
  }
}
```

#### Real-time Feedback
```json
{
  "event": "feedback_realtime",
  "data": {
    "type": "confidence",
    "score": 8,
    "message": "Good confidence level",
    "timestamp": "2024-01-15T10:00:10Z"
  }
}
```

#### Error
```json
{
  "event": "error",
  "data": {
    "message": "Session not found",
    "code": "SESSION_NOT_FOUND"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Invalid or missing authentication |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request data |
| `SESSION_NOT_FOUND` | Session does not exist |
| `WEBSOCKET_ERROR` | WebSocket connection error |

## Rate Limiting

API requests are rate limited to prevent abuse:

- 100 requests per 15 minutes per IP
- WebSocket connections: 5 concurrent connections per IP

## SDKs

### JavaScript/TypeScript

```typescript
import { api } from '@live-ai-coach/web/lib/api';

const sessions = await api.get('/sessions');
```

### WebSocket

```typescript
import { ws } from '@live-ai-coach/web/lib/websocket';

await ws.connect();
ws.joinSession('session-id');
ws.startSession();
```
