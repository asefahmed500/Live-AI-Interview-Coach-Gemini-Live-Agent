const io = require('socket.io-client');

const WS_URL = 'wss://live-interview-api-ywh3e45esq-uc.a.run.app';

console.log('Testing WebSocket...');
console.log('URL:', WS_URL);

const socket = io(WS_URL, {
  path: '/live',
  reconnection: false,
  timeout: 15000
});

socket.on('connect', () => {
  console.log('Connected! Socket ID:', socket.id);
  socket.emit('start_session', {
    mode: 'technical',
    difficulty: 'medium'
  });
});

socket.on('connection_established', (data) => {
  console.log('Connection established:', JSON.stringify(data));
});

socket.on('session_started', (data) => {
  console.log('Session started:', JSON.stringify(data));
});

socket.on('ai_response', (data) => {
  console.log('AI Response:', JSON.stringify(data));
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 3000);
});

socket.on('error', (err) => {
  console.log('Error:', err.message);
  process.exit(1);
});

socket.on('connect_error', (err) => {
  console.log('Connection error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('Timeout - no response');
  process.exit(1);
}, 20000);
