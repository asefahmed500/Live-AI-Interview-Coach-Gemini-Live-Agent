import { useCallback } from 'react';
import { useInterviewStore } from '@/store';
import { getWebSocketClient } from '@/lib/websocket-client';
import type { InterviewMode, InterviewDifficulty } from '@/types';

/**
 * Custom hook to manage interview session operations
 */
export function useInterview() {
  const store = useInterviewStore();
  const wsClient = getWebSocketClient();

  // Start a new interview session
  const startSession = useCallback(
    (jobDescription: string, mode: InterviewMode, difficulty?: InterviewDifficulty) => {
      store.setJobDescription(jobDescription);
      store.setMode(mode);
      if (difficulty) {
        store.setDifficulty(difficulty);
      }

      wsClient.startSession({
        jobDescription,
        mode,
        difficulty,
      });

      store.setSessionState('starting');
    },
    [store, wsClient]
  );

  // Send audio chunk to server
  const sendAudio = useCallback(
    (audioData: ArrayBuffer, sequenceNumber: number) => {
      wsClient.sendAudioChunk({
        sessionId: store.sessionId || '',
        chunkData: JSON.stringify(Array.from(new Uint8Array(audioData))),
        sequenceNumber,
        timestamp: Date.now(),
      });
    },
    [wsClient, store.sessionId]
  );

  // Send frame analysis data
  const sendFrameAnalysis = useCallback(
    (analysis: { confidence: number; emotions: string[]; eyeContact: boolean }) => {
      wsClient.sendFrameAnalysis({
        sessionId: store.sessionId || '',
        frameData: JSON.stringify(analysis),
        frameNumber: 0,
        timestamp: Date.now(),
      });

      // Update local confidence state
      store.updateConfidence(analysis.confidence);
    },
    [wsClient, store.sessionId, store]
  );

  // Interrupt the current session
  const interruptSession = useCallback(() => {
    if (store.sessionId) {
      wsClient.interruptSession({
        sessionId: store.sessionId,
        reason: 'user_interrupt',
        timestamp: Date.now(),
      });
    }
  }, [wsClient, store.sessionId]);

  // Stop the current session
  const stopSession = useCallback(() => {
    if (store.sessionId) {
      wsClient.stopSession({
        sessionId: store.sessionId,
        endTime: Date.now(),
        reason: 'user_ended',
      });
      store.setSessionState('ending');
    }
  }, [wsClient, store.sessionId, store]);

  // Toggle recording state
  const toggleRecording = useCallback(() => {
    const newState = !store.isRecording;
    store.setIsRecording(newState);

    if (newState && store.sessionState === 'idle') {
      // Auto-start session if idle
      return 'start_session';
    } else if (!newState && store.sessionState === 'active') {
      // Auto-stop session if active
      stopSession();
    }

    return newState;
  }, [store, stopSession]);

  // Reset the current session
  const resetSession = useCallback(() => {
    store.resetSession();
  }, [store]);

  return {
    // State
    sessionState: store.sessionState,
    sessionId: store.sessionId,
    isRecording: store.isRecording,
    jobDescription: store.jobDescription,
    mode: store.mode,
    difficulty: store.difficulty,
    transcript: store.transcript,
    currentTranscript: store.currentTranscript,
    confidence: store.confidence,

    // Actions
    startSession,
    sendAudio,
    sendFrameAnalysis,
    interruptSession,
    stopSession,
    toggleRecording,
    resetSession,
  };
}
