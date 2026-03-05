import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import type {
  SessionState,
  ConnectionState,
  InterviewSession,
  InterviewMode,
  InterviewDifficulty,
  TranscriptMessage,
  ConfidenceData,
} from '@/types';

interface InterviewStore {
  // UI state
  connectionState: ConnectionState;
  sessionState: SessionState;
  sidebarOpen: boolean;
  isRecording: boolean;

  // Session data
  currentSession: InterviewSession | null;
  sessionId: string | null;
  jobDescription: string;
  mode: InterviewMode;
  difficulty: InterviewDifficulty | null;

  // Transcript
  transcript: TranscriptMessage[];
  currentTranscript: string; // For streaming AI responses

  // Confidence
  confidence: ConfidenceData;

  // Error state
  error: string | null;

  // Actions
  setConnectionState: (state: ConnectionState) => void;
  setSessionState: (state: SessionState) => void;
  setSidebarOpen: (open: boolean) => void;
  setIsRecording: (recording: boolean) => void;

  setCurrentSession: (session: InterviewSession) => void;
  setSessionId: (id: string | null) => void;
  setJobDescription: (description: string) => void;
  setMode: (mode: InterviewMode) => void;
  setDifficulty: (difficulty: InterviewDifficulty | null) => void;

  addTranscriptMessage: (message: TranscriptMessage) => void;
  updateCurrentTranscript: (text: string) => void;
  finalizeTranscript: () => void;
  clearTranscript: () => void;

  updateConfidence: (score: number) => void;
  setConfidenceHistory: (history: number[]) => void;

  setError: (error: string | null) => void;

  // Reset actions
  resetSession: () => void;
  resetAll: () => void;
}

const initialConfidence: ConfidenceData = {
  score: 0,
  trend: 'stable',
  history: [],
  lastUpdated: Date.now(),
};

export const useInterviewStore = create<InterviewStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial UI state
        connectionState: 'disconnected',
        sessionState: 'idle',
        sidebarOpen: true,
        isRecording: false,

        // Initial session data
        currentSession: null,
        sessionId: null,
        jobDescription: '',
        mode: 'mixed',
        difficulty: null,

        // Transcript
        transcript: [],
        currentTranscript: '',

        // Confidence
        confidence: initialConfidence,

        // Error state
        error: null,

        // Connection state
        setConnectionState: (state: ConnectionState) =>
          set({ connectionState: state }),

        // Session state
        setSessionState: (state: SessionState) =>
          set({ sessionState: state }),

        // Sidebar
        setSidebarOpen: (open: boolean) =>
          set({ sidebarOpen: open }),

        // Recording state
        setIsRecording: (recording: boolean) =>
          set({ isRecording: recording }),

        // Current session
        setCurrentSession: (session: InterviewSession) =>
          set({ currentSession: session }),

        setSessionId: (id: string | null) =>
          set({ sessionId: id }),

        setJobDescription: (description: string) =>
          set({ jobDescription: description }),

        setMode: (mode: InterviewMode) =>
          set((state) => ({ mode, difficulty: mode === 'mixed' ? state.difficulty : null })),

        setDifficulty: (difficulty: InterviewDifficulty | null) =>
          set({ difficulty }),

        // Transcript actions
        addTranscriptMessage: (message: TranscriptMessage) =>
          set((state) => ({
            transcript: [...state.transcript, message],
          })),

        updateCurrentTranscript: (text: string) =>
          set({ currentTranscript: text }),

        finalizeTranscript: () =>
          set((state) => {
            if (state.currentTranscript) {
              const message: TranscriptMessage = {
                id: `msg_${Date.now()}`,
                sessionId: state.sessionId || '',
                role: 'assistant',
                content: state.currentTranscript,
                timestamp: Date.now(),
              };
              return {
                transcript: [...state.transcript, message],
                currentTranscript: '',
              };
            }
            return state;
          }),

        clearTranscript: () =>
          set({ transcript: [], currentTranscript: '' }),

        // Confidence actions
        updateConfidence: (score: number) =>
          set((state) => {
            const history = [...state.confidence.history, score];
            const trend =
              state.confidence.score === 0
                ? 'stable'
                : score > state.confidence.score
                ? 'up'
                : score < state.confidence.score
                ? 'down'
                : 'stable';

            return {
              confidence: {
                score,
                trend,
                history,
                lastUpdated: Date.now(),
              },
            };
          }),

        setConfidenceHistory: (history: number[]) =>
          set((state) => ({
            confidence: {
              ...state.confidence,
              history,
              score: history.length > 0 ? history[history.length - 1] : 0,
              trend: 'stable',
            },
          })),

        // Error handling
        setError: (error: string | null) =>
          set({ error }),

        // Reset actions
        resetSession: () =>
          set({
            sessionState: 'idle',
            currentSession: null,
            sessionId: null,
            transcript: [],
            currentTranscript: '',
            confidence: initialConfidence,
            isRecording: false,
          }),

        resetAll: () =>
          set({
            connectionState: 'disconnected',
            sessionState: 'idle',
            sidebarOpen: true,
            isRecording: false,
            currentSession: null,
            sessionId: null,
            jobDescription: '',
            mode: 'mixed',
            difficulty: null,
            transcript: [],
            currentTranscript: '',
            confidence: initialConfidence,
            error: null,
          }),
      }),
      {
        name: 'interview-store',
        partialize: (_state) => ({
          // Only persist these fields
          connectionState: true,
          sessionState: true,
          sidebarOpen: true,
          transcript: true,
          confidence: true,
        }),
      }
    )
  )
);
