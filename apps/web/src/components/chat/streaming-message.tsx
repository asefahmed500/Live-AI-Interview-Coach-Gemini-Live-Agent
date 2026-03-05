'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface StreamingMessageProps {
  content: string;
  isStreaming?: boolean;
  isSpeaking?: boolean;
  className?: string;
}

/**
 * Streaming message component with typing animation
 */
export function StreamingMessage({
  content,
  isStreaming = false,
  isSpeaking = false,
  className,
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [_currentIndex, setCurrentIndex] = useState(0);

  // Typewriter effect for streaming content
  useEffect(() => {
    if (isStreaming) {
      setDisplayedContent(content);
      setCurrentIndex(content.length);
    } else if (content !== displayedContent) {
      // When not streaming, show full content immediately
      setDisplayedContent(content);
      setCurrentIndex(content.length);
    }
  }, [content, isStreaming, displayedContent]);

  return (
    <div className={cn('flex items-start gap-3', className)}>
      {/* AI Avatar */}
      <div className="flex-shrink-0">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
            isSpeaking
              ? 'bg-gradient-to-br from-[#2383e2] to-[#0d47a1] shadow-lg shadow-blue-500/30 scale-110'
              : 'bg-gradient-to-br from-[#2383e2] to-[#0d47a1]',
            isStreaming && !isSpeaking && 'animate-pulse'
          )}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'inline-block max-w-full rounded-2xl px-4 py-3 transition-all duration-200',
            'bg-slate-800 text-slate-100'
          )}
        >
          {/* Text Content */}
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {displayedContent}
          </p>

          {/* Typing Animation */}
          {isStreaming && (
            <span className="inline-flex items-center gap-0.5 ml-1">
              <span
                className="w-1 h-3 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1 h-3 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1 h-3 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </span>
          )}
        </div>

        {/* Speaking Indicator */}
        {isSpeaking && !isStreaming && (
          <div className="flex items-center gap-1 mt-2 text-xs text-blue-400">
            <div className="flex gap-0.5 items-end h-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-0.5 bg-blue-400 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 8 + 4}px`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
            <span className="ml-1">Speaking…</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * User message component
 */
interface UserMessageProps {
  content: string;
  timestamp?: number;
  className?: string;
}

export function UserMessage({ content, timestamp, className }: UserMessageProps) {
  return (
    <div className={cn('flex items-start gap-3 justify-end', className)}>
      {/* Message Content */}
      <div className="max-w-md">
        <div className="bg-blue-500 text-white rounded-2xl px-4 py-3">
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{content}</p>
        </div>
        {timestamp && (
          <p className="text-xs text-slate-500 mt-1 text-right">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {/* User Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
        <svg
          className="w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
    </div>
  );
}

/**
 * System message component for status updates
 */
interface SystemMessageProps {
  content: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
}

export function SystemMessage({ content, type = 'info', className }: SystemMessageProps) {
  const typeStyles = {
    info: 'bg-slate-800/50 text-slate-400 border-slate-700',
    success: 'bg-green-500/10 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    error: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <div className={cn('flex justify-center my-2', className)}>
      <div className={cn('px-4 py-2 rounded-full text-xs border', typeStyles[type])}>{content}</div>
    </div>
  );
}
