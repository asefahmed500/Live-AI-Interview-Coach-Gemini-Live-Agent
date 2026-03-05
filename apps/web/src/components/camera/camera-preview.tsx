'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Video, VideoOff, AlertCircle } from 'lucide-react';

interface CameraPreviewProps {
  stream: MediaStream | null;
  isAnalyzing?: boolean;
  error?: string | null;
  className?: string;
  showLabel?: boolean;
  mirror?: boolean;
}

/**
 * Camera preview component for displaying webcam feed
 */
export function CameraPreview({
  stream,
  isAnalyzing = false,
  error = null,
  className,
  showLabel = true,
  mirror = true,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Attach stream to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    if (stream) {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        setIsReady(true);
      };
      return () => {
        video.srcObject = null;
        setIsReady(false);
      };
    } else {
      video.srcObject = null;
      setIsReady(false);
    }
    return undefined;
  }, [stream]);

  if (error) {
    return (
      <div className={cn('relative bg-slate-900 rounded-xl overflow-hidden', className)}>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-sm text-red-400 font-medium">Camera Error</p>
          <p className="text-xs text-red-300/80 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative bg-slate-900 rounded-xl overflow-hidden', className)}>
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={cn('w-full h-full object-cover', mirror && 'scale-x-[-1]')}
      />

      {/* Loading State */}
      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Starting camera…</p>
          </div>
        </div>
      )}

      {/* Overlay */}
      {isReady && (
        <>
          {/* Analysis Indicator */}
          {isAnalyzing && (
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-green-500/90 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-medium text-white">Analyzing</span>
            </div>
          )}

          {/* Corner Brackets */}
          <div className="absolute inset-4 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400/50 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400/50 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400/50 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400/50 rounded-br-lg" />
          </div>

          {/* Label */}
          {showLabel && (
            <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 backdrop-blur rounded">
              <p className="text-xs text-white/80">Camera Feed</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Camera toggle button component
 */
interface CameraToggleButtonProps {
  isActive: boolean;
  isAnalyzing?: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CameraToggleButton({
  isActive,
  isAnalyzing = false,
  onToggle,
  disabled = false,
  size = 'md',
}: CameraToggleButtonProps) {
  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'rounded-full transition-all duration-200',
        sizeClasses[size],
        isActive
          ? 'bg-blue-500 hover:bg-blue-600 text-white'
          : 'bg-slate-800 hover:bg-slate-700 text-slate-300',
        disabled && 'opacity-50 cursor-not-allowed',
        isAnalyzing && 'ring-2 ring-green-400 ring-offset-2 ring-offset-slate-900'
      )}
      title={isActive ? 'Stop camera' : 'Start camera'}
    >
      {isActive ? <Video className={iconSizes[size]} /> : <VideoOff className={iconSizes[size]} />}
    </button>
  );
}

/**
 * Camera stats component
 */
interface CameraStatsProps {
  frameCount?: number;
  resolution?: { width: number; height: number };
  fps?: number;
  className?: string;
}

export function CameraStats({ frameCount, resolution, fps, className }: CameraStatsProps) {
  return (
    <div className={cn('flex items-center gap-4 text-xs text-slate-500', className)}>
      {frameCount !== undefined && (
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          <span>{frameCount} frames</span>
        </div>
      )}
      {resolution && (
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
          <span>
            {resolution.width}x{resolution.height}
          </span>
        </div>
      )}
      {fps !== undefined && (
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
          <span>{fps} FPS</span>
        </div>
      )}
    </div>
  );
}
