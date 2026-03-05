import { useEffect, useRef, useCallback, useState } from 'react';
import { useInterviewStore } from '@/store';
import { getWebSocketClient } from '@/lib/websocket-client';
import type { AIResponsePartial } from '@/types';

interface UseAIStreamingOptions {
  enableSpeech?: boolean;
  speechRate?: number;
  speechPitch?: number;
  voiceName?: string;
}

interface StreamingState {
  isStreaming: boolean;
  currentContent: string;
  sequenceNumber: number;
}

/**
 * Custom hook to handle AI response streaming with optional text-to-speech
 */
export function useAIStreaming(options: UseAIStreamingOptions = {}) {
  const { enableSpeech = false, speechRate = 1.0, speechPitch = 1.0, voiceName } = options;

  const { sessionState, sessionId, updateCurrentTranscript, addTranscriptMessage } =
    useInterviewStore();

  const wsClient = useRef(getWebSocketClient());
  const streamingStateRef = useRef<StreamingState>({
    isStreaming: false,
    currentContent: '',
    sequenceNumber: -1,
  });

  // Speech synthesis refs
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('[useAIStreaming] Speech synthesis not supported');
      return;
    }

    // Load available voices
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);

      // Select voice by name if specified
      if (voiceName) {
        const voice = voices.find((v) => v.name === voiceName);
        if (voice) selectedVoiceRef.current = voice;
      } else {
        // Default to first English voice
        const englishVoice = voices.find((v) => v.lang.startsWith('en'));
        if (englishVoice) selectedVoiceRef.current = englishVoice;
      }
    };

    loadVoices();

    // Voices load asynchronously in some browsers
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, [voiceName]);

  // Stop speech playback immediately
  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      console.log('[useAIStreaming] Speech stopped');
    }
  }, []);

  // Speak text using Web Speech API
  const speak = useCallback(
    (text: string) => {
      if (!enableSpeech || typeof window === 'undefined' || !window.speechSynthesis) {
        return;
      }

      // Cancel any ongoing speech
      stopSpeech();

      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesisRef.current = utterance;

      // Configure utterance
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }

      // Event handlers
      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log('[useAIStreaming] Speech started');
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('[useAIStreaming] Speech ended');
      };

      utterance.onerror = (event) => {
        console.error('[useAIStreaming] Speech error:', event.error);
        setIsSpeaking(false);
      };

      utterance.onpause = () => {
        setIsSpeaking(false);
      };

      utterance.onresume = () => {
        setIsSpeaking(true);
      };

      // Start speaking
      window.speechSynthesis.speak(utterance);
    },
    [enableSpeech, speechRate, speechPitch, stopSpeech]
  );

  // Handle partial AI response
  const handleAIResponsePartial = useCallback(
    (data: AIResponsePartial) => {
      const { content, delta, isFinal, sequenceNumber = 0 } = data;

      // Check for sequence continuity (detect out-of-order chunks)
      if (
        streamingStateRef.current.isStreaming &&
        sequenceNumber !== undefined &&
        sequenceNumber <= streamingStateRef.current.sequenceNumber
      ) {
        // Duplicate or out-of-order chunk, skip
        return;
      }

      if (isFinal) {
        // Finalize the streaming response
        const finalContent = streamingStateRef.current.currentContent || content || '';

        // Add to transcript
        addTranscriptMessage({
          id: `msg_${Date.now()}`,
          sessionId: data.sessionId,
          role: 'assistant',
          content: finalContent,
          timestamp: Date.now(),
        });

        // Reset streaming state
        streamingStateRef.current = {
          isStreaming: false,
          currentContent: '',
          sequenceNumber: -1,
        };

        // Clear current transcript in store
        updateCurrentTranscript('');

        // Speak the final response if enabled
        if (enableSpeech && finalContent) {
          speak(finalContent);
        }
      } else {
        // Streaming in progress
        streamingStateRef.current.isStreaming = true;

        if (delta) {
          // Incremental update (append delta)
          streamingStateRef.current.currentContent += delta;
        } else {
          // Full content update
          streamingStateRef.current.currentContent = content || '';
        }

        if (sequenceNumber !== undefined) {
          streamingStateRef.current.sequenceNumber = sequenceNumber;
        }

        // Update the store for live UI
        updateCurrentTranscript(streamingStateRef.current.currentContent);
      }
    },
    [addTranscriptMessage, updateCurrentTranscript, enableSpeech, speak]
  );

  // Handle interrupt - stop speech immediately
  const handleInterrupt = useCallback(() => {
    stopSpeech();

    // If we're streaming, finalize the current content
    if (streamingStateRef.current.isStreaming) {
      const currentContent = streamingStateRef.current.currentContent;
      if (currentContent && sessionId) {
        addTranscriptMessage({
          id: `msg_interrupted_${Date.now()}`,
          sessionId,
          role: 'assistant',
          content: currentContent + '…',
          timestamp: Date.now(),
        });
      }

      // Reset streaming state
      streamingStateRef.current = {
        isStreaming: false,
        currentContent: '',
        sequenceNumber: -1,
      };

      updateCurrentTranscript('');
    }
  }, [stopSpeech, sessionId, addTranscriptMessage, updateCurrentTranscript]);

  // Setup WebSocket event listeners
  useEffect(() => {
    const client = wsClient.current;

    // Listen for partial AI responses
    const unsubscribeAIResponsePartial = client.on(
      'ai_response_partial',
      (data: AIResponsePartial) => {
        console.log('[useAIStreaming] Received AI response partial:', data);
        handleAIResponsePartial(data);
      }
    );

    // Also listen for complete AI responses (fallback)
    const unsubscribeAIResponse = client.on('ai_response', (data: any) => {
      console.log('[useAIStreaming] Received AI response:', data);
      if (data.content) {
        addTranscriptMessage({
          id: `msg_${Date.now()}`,
          sessionId: data.sessionId,
          role: 'assistant',
          content: data.content,
          timestamp: Date.now(),
        });

        // Speak the complete response if enabled
        if (enableSpeech && data.content) {
          speak(data.content);
        }
      }
    });

    // Listen for interrupt acknowledgements
    const unsubscribeInterruptAcknowledged = client.on('interrupt_acknowledged', () => {
      console.log('[useAIStreaming] Interrupt acknowledged');
      handleInterrupt();
    });

    // Cleanup
    return () => {
      unsubscribeAIResponsePartial();
      unsubscribeAIResponse();
      unsubscribeInterruptAcknowledged();
      stopSpeech();
    };
  }, [
    handleAIResponsePartial,
    handleInterrupt,
    addTranscriptMessage,
    enableSpeech,
    speak,
    stopSpeech,
  ]);

  // Cleanup on session end
  useEffect(() => {
    if (sessionState === 'ended' || sessionState === 'error') {
      stopSpeech();
      streamingStateRef.current = {
        isStreaming: false,
        currentContent: '',
        sequenceNumber: -1,
      };
    }
  }, [sessionState, stopSpeech]);

  return {
    isStreaming: streamingStateRef.current.isStreaming,
    currentContent: streamingStateRef.current.currentContent,
    isSpeaking,
    availableVoices,
    selectedVoice: selectedVoiceRef.current,
    stopSpeech,
    speak,
  };
}
