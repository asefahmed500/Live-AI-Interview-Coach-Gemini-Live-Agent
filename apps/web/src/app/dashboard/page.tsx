'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InterviewArea } from '@/components/interview';
import { SidebarRight } from '@/components/layout';
import { useAuthStore } from '@/store/use-auth-store';
import { useWebSocket, useAIStreaming } from '@/hooks';

export default function DashboardPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, router]);

  // Initialize WebSocket connection with reconnection (only if authenticated)
  useWebSocket(isAuthenticated);

  // Initialize AI streaming with text-to-speech (only if authenticated)
  useAIStreaming({
    enableSpeech: isAuthenticated,
    speechRate: 1.0,
    speechPitch: 1.0,
  });

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
