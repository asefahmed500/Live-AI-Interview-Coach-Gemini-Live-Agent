'use client';

import { useInterviewStore } from '@/store';
import { useBetterAuthStore } from '@/store/use-better-auth-store';
import { cn } from '@/lib/utils';
import {
  Mic,
  MicOff,
  Video,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  X,
  Settings,
  RotateCw,
  LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { connectionState, sessionState, isRecording, error } = useInterviewStore();
  const { user, isAuthenticated, logout } = useBetterAuthStore();
  const router = useRouter();

  // Get connection signal icon
  const getConnectionIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <SignalHigh className="w-4 h-4" style={{ color: 'oklch(0.50 0 0)' }} />;
      case 'connecting':
        return <SignalMedium className="w-4 h-4 animate-pulse" style={{ color: 'oklch(0.55 0 0)' }} />;
      case 'error':
        return <SignalLow className="w-4 h-4" style={{ color: 'oklch(0.40 0 0)' }} />;
      default:
        return <Signal className="w-4 h-4" style={{ color: 'oklch(0.70 0 0)' }} />;
    }
  };

  // Get connection text
  const getConnectionText = () => {
    if (error && connectionState === 'error') {
      return error.length > 20 ? error.substring(0, 20) + '…' : error;
    }

    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting…';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  // Get session status text
  const getSessionText = () => {
    switch (sessionState) {
      case 'idle':
        return 'Ready';
      case 'starting':
        return 'Starting…';
      case 'active':
        return 'Active';
      case 'paused':
        return 'Paused';
      case 'ending':
        return 'Ending…';
      case 'completed':
        return 'Done';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 backdrop-blur-xl" style={{ background: 'oklch(1.00 0 0 / 0.85)', borderBottom: '1px solid oklch(0.92 0 0)' }}>
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Logo and Session Info */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
              <span className="font-bold text-xs" style={{ color: 'oklch(0.40 0 0)' }}>AI</span>
            </div>
            <h1 className="font-medium hidden sm:block text-sm" style={{ color: 'oklch(0.20 0 0)' }}>
              Interview Coach
            </h1>
          </div>

          {/* Divider */}
          <div className="w-px h-4 hidden md:block" style={{ background: 'oklch(0.92 0 0)' }} />

          {/* Connection Status */}
          <div className="flex items-center gap-2 hidden md:flex">
            {getConnectionIcon()}
            <span className="text-xs font-medium" style={{ color: 'oklch(0.50 0 0)' }}>
              {getConnectionText()}
            </span>
            {connectionState === 'error' && (
              <button
                onClick={() => window.location.reload()}
                className="p-1 rounded-md transition-all duration-150 hover-notion"
                style={{ color: 'oklch(0.40 0 0)' }}
                title="Reconnect"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Session Status */}
          <div className="flex items-center gap-2 hidden md:flex">
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                sessionState === 'active' && 'animate-pulse'
              )}
              style={{
                background: sessionState === 'active' ? 'oklch(0.50 0 0)' :
                           sessionState === 'error' ? 'oklch(0.40 0 0)' :
                           'oklch(0.70 0 0)'
              }}
            />
            <span className="text-xs font-medium" style={{ color: 'oklch(0.50 0 0)' }}>{getSessionText()}</span>
          </div>
        </div>

        {/* Center: Recording Controls */}
        <div className="flex items-center gap-1">
          <button
            className={cn(
              'p-2 rounded-md transition-all duration-150',
              isRecording ? 'hover:bg-red-50' : 'hover-notion'
            )}
            style={isRecording ? { color: 'oklch(0.45 0 0)' } : { color: 'oklch(0.40 0 0)' }}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <button
            className="p-2 rounded-md transition-all duration-150 hover-notion"
            style={{ color: 'oklch(0.40 0 0)' }}
            aria-label="Toggle camera"
          >
            <Video className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Settings Button */}
          <button
            className="p-2 rounded-md transition-all duration-150 hover-notion"
            style={{ color: 'oklch(0.40 0 0)' }}
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-md transition-all duration-150 hover-notion hover:text-red-400"
              style={{ color: 'oklch(0.40 0 0)' }}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* Toggle Sidebar Button */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md transition-all duration-150 hover-notion lg:hidden"
            style={{ color: 'oklch(0.40 0 0)' }}
            aria-label="Toggle sidebar"
          >
            <X className="w-4 h-4" />
          </button>

          {/* User Avatar */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 pl-3" style={{ borderLeft: '1px solid oklch(0.92 0 0)' }}>
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
                <span className="text-xs font-semibold" style={{ color: 'oklch(0.40 0 0)' }}>
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-sm hidden sm:block font-medium" style={{ color: 'oklch(0.20 0 0)' }}>
                {user.name}
              </span>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
              <span className="text-xs" style={{ color: 'oklch(0.60 0 0)' }}>U</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
