// Test WebSocket connection to deployed backend
const io = require('socket.io-client');

const API_URL = 'https://live-interview-api-ywh3e45esq-uc.a.run.app';
const WS_URL = 'wss://live-interview-api-ywh3e45esq-uc.a.run.app';

console.log('Testing WebSocket connection to:', WS_URL);

const socket = io(WS_URL, {
  path: '/live',
  reconnection: false,
  timeout: 10000
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected successfully!');
  console.log('   Socket ID:', socket.id);

  // Test starting a session
  socket.emit('start_session', {
    userId: 'test-user-' + Date.now(),
    interviewType: 'behavioral'
  });

  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 5000);
});

socket.on('connection_established', (data) => {
  console.log('✅ Connection established event received:', data);
});

socket.on('session_started', (data) => {
  console.log('✅ Session started event received:', data);
});

socket.on('connect_error', (error) => {
  console.log('❌ WebSocket connection error:', error.message);
  process.exit(1);
});

socket.on('error', (error) => {
  console.log('❌ WebSocket error:', error);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('WebSocket disconnected:', reason);
  process.exit(0);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('❌ WebSocket connection timeout');
  process.exit(1);
}, 15000);
