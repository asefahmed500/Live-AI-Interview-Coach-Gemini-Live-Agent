/**
 * WebSocket Connection Test - Testing stop_session fix
 */
const io = require('socket.io-client');

const WS_URL = 'ws://localhost:3001/live';

console.log('Testing stop_session fix...');

const socket = io(WS_URL, {
  transports: ['websocket'],
});

let testSessionId = null;

socket.on('connect', () => {
  console.log('\n✅ Connected');

  setTimeout(() => {
    console.log('\n📤 Starting session...');
    socket.emit('start_session', {
      jobDescription: 'Senior Frontend Developer',
      mode: 'behavioral',
      difficulty: 'senior'
    });
  }, 1000);
});

socket.on('session_started', (data) => {
  console.log('\n✅ Session started');
  console.log(`   Session ID: ${data.sessionId}`);
  testSessionId = data.sessionId;

  // Test stop_session after 3 seconds
  setTimeout(() => {
    console.log('\n📤 Stopping session...');
    socket.emit('stop_session', {
      sessionId: testSessionId,
      reason: 'user_completed',
      generateReport: false
    });
  }, 3000);
});

socket.on('session_ended', (data) => {
  console.log('\n✅ SESSION_ENDED - FIX WORKS!');
  console.log(`   Data:`, JSON.stringify(data, null, 2));
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 500);
});

socket.on('error', (data) => {
  if (data.code === 'SESSION_NOT_FOUND') {
    console.log('\n❌ SESSION_NOT_FOUND - Fix did not work');
  } else {
    console.log('\n❌ Error:', data);
  }
});

setTimeout(() => {
  console.log('\n⚠️ Test timeout');
  socket.disconnect();
  process.exit(1);
}, 15000);
