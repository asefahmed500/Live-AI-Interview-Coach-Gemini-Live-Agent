import { useRef, useCallback, useEffect, useState } from 'react';
import { useInterviewStore } from '@/store';
import { getWebSocketClient } from '@/lib/websocket-client';

interface CameraAnalysisOptions {
  captureInterval?: number; // milliseconds
  quality?: number; // 0-1 for JPEG quality
  maxWidth?: number;
  maxHeight?: number;
}

interface UseCameraAnalysisReturn {
  isAnalyzing: boolean;
  error: string | null;
  startAnalysis: () => Promise<void>;
  stopAnalysis: () => void;
  videoStream: MediaStream | null;
  frameCount: number;
}

const DEFAULT_CAPTURE_INTERVAL = 2000; // 2 seconds
const DEFAULT_QUALITY = 0.7;
const DEFAULT_MAX_WIDTH = 640;
const DEFAULT_MAX_HEIGHT = 480;

/**
 * Custom hook to manage camera frame capture and analysis
 * Captures frames from webcam and sends them via WebSocket for analysis
 */
export function useCameraAnalysis(options: CameraAnalysisOptions = {}): UseCameraAnalysisReturn {
  const {
    captureInterval = DEFAULT_CAPTURE_INTERVAL,
    quality = DEFAULT_QUALITY,
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef(0);

  const { sessionState, sessionId } = useInterviewStore();
  const wsClient = useRef(getWebSocketClient());

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create hidden video and canvas elements
  useEffect(() => {
    // Create video element
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.display = 'none';
    document.body.appendChild(video);
    videoRef.current = video;

    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    return () => {
      // Cleanup elements
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, []);

  // Get user media (camera access)
  const getCameraStream = useCallback(async (): Promise<MediaStream> => {
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      return stream;
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error('Camera permission denied. Please allow access to your camera.');
        }
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          throw new Error('No camera found. Please connect a camera and try again.');
        }
        if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          throw new Error('Camera is already in use by another application.');
        }
        if (err.name === 'OverconstrainedError') {
          throw new Error('Camera does not support the requested settings.');
        }
        throw err;
      }
      throw new Error('Failed to access camera');
    }
  }, []);

  // Capture frame from video and send for analysis
  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !sessionId || sessionState !== 'active') {
      return;
    }

    // Ensure video is ready
    if (video.readyState < 2) {
      return;
    }

    try {
      // Calculate dimensions maintaining aspect ratio
      const videoRatio = video.videoWidth / video.videoHeight;
      let canvasWidth = maxWidth;
      let canvasHeight = maxHeight;

      if (videoRatio > canvasWidth / canvasHeight) {
        canvasHeight = canvasWidth / videoRatio;
      } else {
        canvasWidth = canvasHeight * videoRatio;
      }

      // Set canvas dimensions
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Mirror the video horizontally (like a mirror)
      ctx.translate(canvasWidth, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

      // Convert to base64
      const base64Data = canvas.toDataURL('image/jpeg', quality);

      // Remove data URL prefix to get pure base64
      const base64String = base64Data.split(',')[1];

      // Send frame analysis via WebSocket
      wsClient.current.sendFrameAnalysis({
        sessionId,
        frameData: base64String,
        timestamp: Date.now(),
        frameNumber: frameCountRef.current,
        format: 'jpeg',
        width: canvasWidth,
        height: canvasHeight,
      });

      frameCountRef.current++;
      console.log(
        `[useCameraAnalysis] Frame captured: ${canvasWidth}x${canvasHeight}, frame #${frameCountRef.current}`
      );
    } catch (err) {
      console.error('[useCameraAnalysis] Failed to capture frame:', err);
      // Don't throw - continue trying to capture frames
    }
  }, [sessionId, sessionState, maxWidth, maxHeight, quality]);

  // Start camera analysis
  const startAnalysis = useCallback(async () => {
    try {
      setError(null);

      // Get camera stream
      const stream = await getCameraStream();
      streamRef.current = stream;

      // Attach stream to video element
      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element not initialized');
      }

      video.srcObject = stream;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(reject);
        };
        video.onerror = reject;
      });

      // Capture initial frame
      setTimeout(() => {
        captureFrame();
      }, 500);

      // Start interval for frame capture
      intervalRef.current = setInterval(() => {
        captureFrame();
      }, captureInterval);

      setIsAnalyzing(true);
      console.log('[useCameraAnalysis] Camera analysis started');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';
      setError(errorMessage);
      console.error('[useCameraAnalysis] Start analysis error:', err);
      throw err;
    }
  }, [getCameraStream, captureFrame, captureInterval]);

  // Stop camera analysis
  const stopAnalysis = useCallback(() => {
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsAnalyzing(false);
    console.log('[useCameraAnalysis] Camera analysis stopped');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalysis();
    };
  }, [stopAnalysis]);

  // Auto-stop when session ends
  useEffect(() => {
    if (sessionState !== 'active' && isAnalyzing) {
      stopAnalysis();
    }
  }, [sessionState, isAnalyzing, stopAnalysis]);

  return {
    isAnalyzing,
    error,
    startAnalysis,
    stopAnalysis,
    videoStream: streamRef.current,
    frameCount: frameCountRef.current,
  };
}

/**
 * Hook to get camera preview element
 * Useful for displaying the camera feed in the UI
 */
export function useCameraPreview() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.className = 'w-full h-full object-cover rounded-lg mirror-effect';
    document.body.appendChild(video);
    videoRef.current = video;

    return () => {
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    };
  }, []);

  const attachStream = useCallback((stream: MediaStream) => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, []);

  const detachStream = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const getVideoElement = useCallback(() => {
    return videoRef.current;
  }, []);

  return {
    attachStream,
    detachStream,
    getVideoElement,
  };
}
