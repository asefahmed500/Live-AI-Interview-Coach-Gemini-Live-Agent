import { useRef, useCallback, useEffect, useState } from 'react';
import { useInterviewStore } from '@/store';
import { getWebSocketClient } from '@/lib/websocket-client';

interface AudioStreamOptions {
  chunkInterval?: number; // milliseconds
  mimeType?: string;
  sampleRate?: number;
}

interface UseAudioStreamReturn {
  isRecording: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  audioStream: MediaStream | null;
}

const DEFAULT_CHUNK_INTERVAL = 300; // 300ms
const DEFAULT_MIME_TYPE = 'audio/webm;codecs=opus';

/**
 * Custom hook to manage audio streaming using MediaRecorder API
 * Captures audio chunks and sends them via WebSocket
 */
export function useAudioStream(options: AudioStreamOptions = {}): UseAudioStreamReturn {
  const {
    chunkInterval = DEFAULT_CHUNK_INTERVAL,
    mimeType = DEFAULT_MIME_TYPE,
  } = options;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sequenceNumberRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);

  const { sessionState, sessionId, isRecording: storeIsRecording } = useInterviewStore();
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsClient = useRef(getWebSocketClient());

  // Check if MediaRecorder is supported
  const isSupported = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return MediaRecorder.isTypeSupported(mimeType);
  }, [mimeType]);

  // Get user media (microphone access)
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      // Check browser support
      if (!isSupported()) {
        throw new Error(`MediaRecorder type ${mimeType} is not supported in this browser`);
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });

      return stream;
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error('Microphone permission denied. Please allow access to your microphone.');
        }
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        }
        if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          throw new Error('Microphone is already in use by another application.');
        }
        throw err;
      }
      throw new Error('Failed to access microphone');
    }
  }, [isSupported, mimeType]);

  // Convert ArrayBuffer to base64 string (loop-based, safe for large chunks)
  const arrayBufferToBase64 = useCallback((buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }, []);

  // Send audio chunk via WebSocket
  const sendAudioChunk = useCallback(async (chunk: Blob) => {
    if (sessionId && sessionState === 'active') {
      try {
        const arrayBuffer = await chunk.arrayBuffer();
        wsClient.current.sendAudioChunk({
          sessionId,
          chunkData: arrayBufferToBase64(arrayBuffer),
          sequenceNumber: sequenceNumberRef.current++,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('[useAudioStream] Failed to send audio chunk:', err);
      }
    }
  }, [sessionId, sessionState, arrayBufferToBase64]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Get media stream
      const stream = await getMediaStream();
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      sequenceNumberRef.current = 0;

      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Start recording with time slice
      mediaRecorder.start(chunkInterval);

      // Set up interval to send chunks
      intervalRef.current = setInterval(() => {
        if (chunksRef.current.length > 0) {
          const chunk = chunksRef.current.shift();
          if (chunk) {
            sendAudioChunk(chunk);
          }
        }
      }, chunkInterval);

      setIsRecording(true);
      console.log('[useAudioStream] Recording started');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      console.error('[useAudioStream] Start recording error:', err);
      throw err;
    }
  }, [getMediaStream, mimeType, chunkInterval, sendAudioChunk]);

  // Stop recording
  const stopRecording = useCallback(() => {
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Send remaining chunks
    if (chunksRef.current.length > 0) {
      chunksRef.current.forEach((chunk) => {
        sendAudioChunk(chunk);
      });
      chunksRef.current = [];
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    setIsRecording(false);
    console.log('[useAudioStream] Recording stopped');
  }, [sendAudioChunk]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  // Sync with store recording state
  useEffect(() => {
    if (storeIsRecording && !isRecording && sessionState === 'active') {
      startRecording().catch((err) => {
        console.error('[useAudioStream] Auto-start failed:', err);
      });
    } else if (!storeIsRecording && isRecording) {
      stopRecording();
    }
  }, [storeIsRecording, isRecording, sessionState, startRecording, stopRecording]);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    audioStream: streamRef.current,
  };
}
