'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InterviewArea } from '@/components/interview';
import { SidebarRight } from '@/components/layout';
import { useBetterAuthStore, useBetterAuthInit } from '@/store/use-better-auth-store';
import { useWebSocket, useAIStreaming } from '@/hooks';

export default function DashboardPage() {
  const { isAuthenticated } = useBetterAuthStore();
  const { init } = useBetterAuthInit();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize Better Auth session
    init().then(() => {
      setIsInitialized(true);
    });
  }, [init]);

  useEffect(() => {
    // Only redirect after initialization is complete
    if (isInitialized && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, isInitialized, router]);

  // Initialize WebSocket connection with reconnection (only if authenticated)
  useWebSocket(isAuthenticated);

  // Initialize AI streaming with text-to-speech (only if authenticated)
  useAIStreaming({
    enableSpeech: isAuthenticated,
    speechRate: 1.0,
    speechPitch: 1.0,
  });

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(1.00 0 0)' }}>
        <div className="spinner-lg"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(1.00 0 0)' }}>
        <div className="spinner-lg"></div>
      </div>
    );
  }

  return (
    <>
      <InterviewArea />
      <SidebarRight />
    </>
  );
}
