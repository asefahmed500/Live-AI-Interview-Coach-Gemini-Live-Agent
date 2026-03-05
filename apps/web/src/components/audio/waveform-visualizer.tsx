'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

interface WaveformVisualizerProps {
  audioStream: MediaStream | null;
  isRecording: boolean;
  className?: string;
  barCount?: number;
  barWidth?: number;
  gap?: number;
  color?: string;
}

/**
 * Waveform visualizer component using Web Audio API
 * Displays real-time audio waveform as animated bars
 */
export function WaveformVisualizer({
  audioStream,
  isRecording,
  className,
  barCount = 60,
  barWidth = 3,
  gap = 2,
  color = 'rgb(59, 130, 246)',
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Initialize Web Audio API
  const initializeAudioContext = useCallback(async () => {
    if (!audioStream || !canvasRef.current) return;

    try {
      // Create AudioContext
      const audioContext = new AudioContext({
        sampleRate: 48000,
      });
      audioContextRef.current = audioContext;

      // Create AnalyserNode
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyserRef.current = analyser;

      // Create source from stream
      const source = audioContext.createMediaStreamSource(audioStream);
      sourceRef.current = source;

      // Connect source to analyser
      source.connect(analyser);

      console.log('[WaveformVisualizer] Audio context initialized');
    } catch (err) {
      console.error('[WaveformVisualizer] Failed to initialize audio context:', err);
    }
  }, [audioStream]);

  // Cleanup Web Audio API resources
  const cleanupAudioContext = useCallback(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    console.log('[WaveformVisualizer] Audio context cleaned up');
  }, []);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;

    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyser.getByteFrequencyData(dataArray);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate bar properties
    const totalBarWidth = barWidth + gap;
    const effectiveWidth = barCount * totalBarWidth - gap;
    const startX = (width - effectiveWidth) / 2;

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      // Map bar index to frequency data
      const dataIndex = Math.floor((i / barCount) * (bufferLength * 0.7)); // Use 70% of frequency range
      const value = dataArray[dataIndex];

      // Calculate bar height with scaling
      const normalizedValue = value / 255;
      const minBarHeight = 4;
      const maxBarHeight = height * 0.8;
      const barHeight = minBarHeight + normalizedValue * (maxBarHeight - minBarHeight);

      // Calculate bar position
      const x = startX + i * totalBarWidth;
      const y = (height - barHeight) / 2;

      // Create gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, adjustColorOpacity(color, 0.6));

      // Draw rounded bar
      ctx.fillStyle = gradient;
      roundRect(ctx, x, y, barWidth, barHeight, barWidth / 2);
      ctx.fill();
    }

    // Continue animation
    animationIdRef.current = requestAnimationFrame(drawWaveform);
  }, [barCount, barWidth, gap, color]);

  // Initialize when stream becomes available
  useEffect(() => {
    if (audioStream && isRecording) {
      initializeAudioContext().then(() => {
        // Start drawing after a short delay to ensure analyser is ready
        // Skip animation if user prefers reduced motion
        if (!prefersReducedMotion) {
          setTimeout(() => {
            drawWaveform();
          }, 100);
        }
      });
    } else {
      cleanupAudioContext();
    }

    return cleanupAudioContext;
  }, [
    audioStream,
    isRecording,
    initializeAudioContext,
    cleanupAudioContext,
    drawWaveform,
    prefersReducedMotion,
  ]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        canvas.style.width = `${parent.clientWidth}px`;
        canvas.style.height = `${parent.clientHeight}px`;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div
      className={cn(
        'relative bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden',
        className
      )}
      style={{ height: '120px' }}
    >
      <canvas ref={canvasRef} className="w-full h-full" style={{ imageRendering: 'pixelated' }} />

      {/* Recording indicator */}
      {isRecording && (
        <div
          className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-red-500/20 rounded-full"
          role="status"
          aria-live="polite"
        >
          <div
            className={cn(
              'w-2 h-2 bg-red-500 rounded-full',
              prefersReducedMotion ? '' : 'animate-pulse'
            )}
            aria-hidden="true"
          />
          <span className="text-xs text-red-400 font-medium">LIVE</span>
        </div>
      )}

      {/* Idle state message */}
      {!isRecording && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-slate-500">
            {audioStream ? 'Ready to record' : 'No audio input'}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to create rounded rectangle on canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Helper function to adjust color opacity
 */
function adjustColorOpacity(color: string, opacity: number): string {
  // Handle rgb(r, g, b) format
  const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Handle hex format
  const hexMatch = color.match(/^#([0-9A-F]{3}){1,2}$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  return color;
}
