'use client';

import { useState, useEffect } from 'react';
import { useInterviewStore } from '@/store';
import { useAudioStream, useAIStreaming, useCameraAnalysis } from '@/hooks';
import { WaveformVisualizer } from '@/components/audio';
import { CameraPreview, CameraStats } from '@/components/camera';
import { StreamingMessage, UserMessage, SystemMessage } from '@/components/chat';
import { cn } from '@/lib/utils';
import {
  Play,
  Square,
  RefreshCw,
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertCircle,
  Video,
} from 'lucide-react';

export function InterviewArea() {
  const {
    sessionState,
    transcript,
    currentTranscript,
    jobDescription,
    isRecording: _isRecording,
    sidebarOpen,
    setIsRecording,
  } = useInterviewStore();

  // Audio streaming hook
  const {
    isRecording: isAudioRecording,
    error: audioError,
    startRecording,
    stopRecording,
    audioStream,
  } = useAudioStream({ chunkInterval: 300 });

  // AI streaming hook with text-to-speech
  const { isStreaming, isSpeaking } = useAIStreaming({
    enableSpeech: true,
  });

  // Camera analysis hook
  const {
    isAnalyzing: isCameraAnalyzing,
    error: cameraError,
    startAnalysis: startCameraAnalysis,
    stopAnalysis: stopCameraAnalysis,
    videoStream: cameraStream,
    frameCount,
  } = useCameraAnalysis({ captureInterval: 2000 });

  // Local state for UI controls
  const [isMuted, setIsMuted] = useState(false);
  const [showCamera, _setShowCamera] = useState(true);

  const hasJobDescription = jobDescription.trim().length > 0;
  const isIdle = sessionState === 'idle';
  const isActive = sessionState === 'active';

  // Handle recording toggle
  const handleToggleRecording = async () => {
    if (isAudioRecording) {
      stopRecording();
      setIsRecording(false);
    } else {
      try {
        await startRecording();
        setIsRecording(true);
      } catch (err) {
        console.error('[InterviewArea] Failed to start recording:', err);
      }
    }
  };

  // Handle camera toggle
  const handleToggleCamera = async () => {
    if (isCameraAnalyzing) {
      stopCameraAnalysis();
    } else {
      try {
        await startCameraAnalysis();
      } catch (err) {
        console.error('[InterviewArea] Failed to start camera:', err);
      }
    }
  };

  // Sync recording state with session state
  useEffect(() => {
    if (sessionState !== 'active' && isAudioRecording) {
      stopRecording();
      setIsRecording(false);
    }
  }, [sessionState, isAudioRecording, stopRecording, setIsRecording]);

  // Sync camera state with session state
  useEffect(() => {
    if (sessionState !== 'active' && isCameraAnalyzing) {
      stopCameraAnalysis();
    }
  }, [sessionState, isCameraAnalyzing, stopCameraAnalysis]);

  return (
    <main
      className={cn(
        'fixed top-14 left-0 bottom-0 transition-all duration-300',
        sidebarOpen ? 'right-72' : 'right-0'
      )}
    >
      <div className="h-full flex flex-col" style={{ background: 'oklch(1.00 0 0)' }}>
        {/* Initial Setup View */}
        {isIdle && !hasJobDescription && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full space-y-6">
              {/* Welcome */}
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-medium" style={{ color: 'oklch(0.20 0 0)' }}>Welcome to Live Interview Coach</h1>
                <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
                  Practice your interview skills with real-time AI feedback
                </p>
              </div>

              {/* Setup Card */}
              <div className="rounded-md border p-6 space-y-4 shadow-notion" style={{ background: 'oklch(1.00 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
                <h2 className="text-base font-medium" style={{ color: 'oklch(0.20 0 0)' }}>Set Up Your Session</h2>

                {/* Job Description Input */}
                <div className="space-y-2">
                  <label htmlFor="job-description" className="text-sm font-medium" style={{ color: 'oklch(0.50 0 0)' }}>
                    Job Description
                  </label>
                  <textarea
                    id="job-description"
                    name="jobDescription"
                    value={jobDescription}
                    onChange={(e) => useInterviewStore.getState().setJobDescription(e.target.value)}
                    placeholder="Paste the job description here…"
                    className="w-full h-32 px-3 py-2 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[oklch(0.80_0_0)] focus:border-transparent transition-all text-sm"
                    style={{ background: 'oklch(1.00 0 0)', border: '1px solid oklch(0.92 0 0)', color: 'oklch(0.20 0 0)' }}
                    aria-describedby="job-description-hint"
                  />
                  <p id="job-description-hint" className="text-xs" style={{ color: 'oklch(0.60 0 0)' }}>
                    Include skills, responsibilities, and qualifications
                  </p>
                </div>

                {/* Mode Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: 'oklch(0.50 0 0)' }} htmlFor="interview-mode">
                    Interview Mode
                  </label>
                  <div
                    id="interview-mode"
                    className="grid grid-cols-3 gap-2"
                    role="group"
                    aria-label="Interview mode selection"
                  >
                    {(['technical', 'behavioral', 'mixed'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => useInterviewStore.getState().setMode(mode)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            useInterviewStore.getState().setMode(mode);
                          }
                        }}
                        className={cn(
                          'px-3 py-2 rounded-md font-medium text-sm capitalize transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.80_0_0)]',
                          useInterviewStore.getState().mode === mode
                            ? ''
                            : 'hover-notion'
                        )}
                        style={useInterviewStore.getState().mode === mode
                          ? { background: 'oklch(0.97 0 0)', color: 'oklch(0.20 0 0)', border: '1px solid oklch(0.92 0 0)' }
                          : { background: 'oklch(1.00 0 0)', color: 'oklch(0.40 0 0)', border: '1px solid oklch(0.92 0 0)' }
                        }
                        aria-pressed={useInterviewStore.getState().mode === mode}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Button */}
                <button
                  className="w-full py-2.5 font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2 shadow-notion hover:shadow-notion-md"
                  style={{ background: 'oklch(0.97 0 0)', color: 'oklch(0.20 0 0)', border: '1px solid oklch(0.92 0 0)' }}
                  onClick={() => {
                    // Trigger session start
                    useInterviewStore.getState().setSessionState('starting');
                  }}
                >
                  <Play className="w-4 h-4" />
                  Start Interview Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Session View */}
        {((isIdle && hasJobDescription) ||
          isActive ||
          sessionState === 'starting' ||
          sessionState === 'ending') && (
          <>
            {/* Audio Error Alert */}
            {audioError && (
              <div className="mx-6 mt-4 p-3 rounded-md flex items-start gap-3 shadow-notion" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'oklch(0.40 0 0)' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'oklch(0.20 0 0)' }}>Audio Error</p>
                  <p className="text-xs mt-1" style={{ color: 'oklch(0.50 0 0)' }}>{audioError}</p>
                </div>
                <button
                  onClick={() => {
                    // Clear error by attempting to re-initialize
                    startRecording().catch(() => {});
                  }}
                  className="px-3 py-1 text-xs rounded-md transition-all hover-notion font-medium"
                  style={{ background: 'oklch(0.97 0 0)', color: 'oklch(0.20 0 0)' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Camera Error Alert */}
            {cameraError && (
              <div className="mx-6 mt-4 p-3 rounded-md flex items-start gap-3 shadow-notion" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'oklch(0.40 0 0)' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'oklch(0.20 0 0)' }}>Camera Error</p>
                  <p className="text-xs mt-1" style={{ color: 'oklch(0.50 0 0)' }}>{cameraError}</p>
                </div>
                <button
                  onClick={() => {
                    // Clear error by attempting to re-initialize
                    startCameraAnalysis().catch(() => {});
                  }}
                  className="px-3 py-1 text-xs rounded-md transition-all hover-notion font-medium"
                  style={{ background: 'oklch(0.97 0 0)', color: 'oklch(0.20 0 0)' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Video/Display Area */}
            <div className="flex-1 relative" style={{ background: 'oklch(1.00 0 0)' }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                {showCamera && cameraStream ? (
                  <>
                    {/* Camera Preview */}
                    <div className="w-full max-w-2xl aspect-video rounded-md overflow-hidden shadow-notion-lg">
                      <CameraPreview
                        stream={cameraStream}
                        isAnalyzing={isCameraAnalyzing}
                        error={cameraError}
                      />
                    </div>

                    {/* Camera Stats */}
                    {isCameraAnalyzing && (
                      <div className="mt-4">
                        <CameraStats frameCount={frameCount} />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Placeholder for Video Feed */}
                    <div className="text-center space-y-4 mb-4">
                      <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center" style={{ background: 'oklch(0.97 0 0)', border: '3px solid oklch(0.92 0 0)' }}>
                        <User className="w-12 h-12" style={{ color: 'oklch(0.60 0 0)' }} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
                          {sessionState === 'starting' && 'Starting session…'}
                          {sessionState === 'ending' && 'Ending session…'}
                          {isIdle && 'Ready to start'}
                          {isActive && 'Session in progress'}
                        </p>
                        {isActive && isAudioRecording && (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'oklch(0.50 0 0)' }} />
                            <span className="text-xs" style={{ color: 'oklch(0.60 0 0)' }}>Recording audio</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Waveform Visualizer */}
                    {(isActive || isIdle) && (
                      <div className="w-full max-w-xl">
                        <WaveformVisualizer
                          audioStream={audioStream}
                          isRecording={isAudioRecording}
                          barCount={80}
                          barWidth={2}
                          gap={2}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Session Controls Overlay */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {/* Camera Toggle */}
                {isActive && (
                  <button
                    onClick={handleToggleCamera}
                    className={cn(
                      'p-3 rounded-md transition-all duration-200 shadow-notion hover:shadow-notion-md',
                      isCameraAnalyzing
                        ? ''
                        : 'hover-notion'
                    )}
                    style={isCameraAnalyzing
                      ? { background: 'oklch(0.97 0 0)', color: 'oklch(0.20 0 0)', border: '1px solid oklch(0.92 0 0)' }
                      : { background: 'oklch(1.00 0 0)', color: 'oklch(0.40 0 0)', border: '1px solid oklch(0.92 0 0)' }
                    }
                    title={isCameraAnalyzing ? 'Stop camera' : 'Start camera'}
                  >
                    <Video className="w-5 h-5" />
                  </button>
                )}

                {/* Microphone Toggle */}
                {isActive && (
                  <button
                    onClick={handleToggleRecording}
                    className={cn(
                      'p-3 rounded-md transition-all duration-200 shadow-notion hover:shadow-notion-md',
                      isAudioRecording
                        ? ''
                        : 'hover-notion'
                    )}
                    style={isAudioRecording
                      ? { background: 'oklch(0.97 0 0)', color: 'oklch(0.20 0 0)', border: '1px solid oklch(0.92 0 0)' }
                      : { background: 'oklch(1.00 0 0)', color: 'oklch(0.40 0 0)', border: '1px solid oklch(0.92 0 0)' }
                    }
                    title={isAudioRecording ? 'Stop recording' : 'Start recording'}
                  >
                    {isAudioRecording ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-6 h-6" />
                    )}
                  </button>
                )}

                {isActive ? (
                  <>
                    {/* Mute Toggle */}
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-3 rounded-md transition-all duration-200 shadow-notion hover:shadow-notion-md hover-notion"
                      style={{ background: 'oklch(1.00 0 0)', color: 'oklch(0.40 0 0)', border: '1px solid oklch(0.92 0 0)' }}
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>

                    {/* Stop Button */}
                    <button
                      className="p-3 rounded-md transition-all duration-200 shadow-notion hover:shadow-notion-md"
                      style={{ background: 'oklch(0.97 0 0)', color: 'oklch(0.20 0 0)', border: '1px solid oklch(0.92 0 0)' }}
                      onClick={() => {
                        stopRecording();
                        stopCameraAnalysis();
                        useInterviewStore.getState().setSessionState('ending');
                      }}
                    >
                      <Square className="w-5 h-5" />
                    </button>

                    {/* Reset Button */}
                    <button
                      className="p-3 rounded-md transition-all duration-200 shadow-notion hover:shadow-notion-md hover-notion"
                      style={{ background: 'oklch(1.00 0 0)', color: 'oklch(0.40 0 0)', border: '1px solid oklch(0.92 0 0)' }}
                      onClick={() => {
                        stopRecording();
                        stopCameraAnalysis();
                        useInterviewStore.getState().resetSession();
                      }}
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Start Button */}
                    <button
                      className="px-6 py-2.5 font-medium rounded-md transition-all duration-200 shadow-notion hover:shadow-notion-md flex items-center gap-2"
                      style={{ background: 'oklch(0.97 0 0)', color: 'oklch(0.20 0 0)', border: '1px solid oklch(0.92 0 0)' }}
                      onClick={async () => {
                        useInterviewStore.getState().setSessionState('active');
                        // Auto-start audio recording when session starts
                        try {
                          await handleToggleRecording();
                          // Also try to start camera analysis
                          await handleToggleCamera();
                        } catch (err) {
                          console.error('[InterviewArea] Failed to start audio/camera:', err);
                        }
                      }}
                    >
                      <Play className="w-4 h-4" />
                      Start Session
                    </button>

                    {/* Reset Button */}
                    {hasJobDescription && (
                      <button
                        className="p-3 rounded-md transition-all duration-200 shadow-notion hover:shadow-notion-md hover-notion"
                        style={{ background: 'oklch(1.00 0 0)', color: 'oklch(0.40 0 0)', border: '1px solid oklch(0.92 0 0)' }}
                        onClick={() => {
                          stopRecording();
                          stopCameraAnalysis();
                          useInterviewStore.getState().resetSession();
                        }}
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Transcript Panel */}
            <div className="h-80 flex flex-col" style={{ background: 'oklch(1.00 0 0)', borderTop: '1px solid oklch(0.92 0 0)' }}>
              {/* Transcript Header */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid oklch(0.92 0 0)' }}>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium" style={{ color: 'oklch(0.50 0 0)' }}>
                    Transcript
                  </h3>
                  {isStreaming && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'oklch(0.50 0 0)' }} />
                      Streaming
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {isSpeaking && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 3.75a.75.75 0 00-1.264-.546L4.703 7H3.167a.75.75 0 00-.7.48A6.985 6.985 0 002 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0010 16.25V3.75zM15.95 5.05a.75.75 0 00-1.06 1.061 5.5 5.5 0 010 7.778.75.75 0 001.06 1.06 7 7 0 000-9.899z" />
                      </svg>
                      Speaking
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'oklch(0.60 0 0)' }}>{transcript.length} messages</span>
                </div>
              </div>

              {/* Transcript Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {transcript.length === 0 && !currentTranscript ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm" style={{ color: 'oklch(0.60 0 0)' }}>
                      {isActive
                        ? 'Start speaking to see the transcript…'
                        : 'Begin the session to see the transcript here.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Previous Messages */}
                    {transcript.map((message) =>
                      message.role === 'user' ? (
                        <UserMessage
                          key={message.id}
                          content={message.content}
                          timestamp={
                            typeof message.timestamp === 'number'
                              ? message.timestamp
                              : new Date(message.timestamp).getTime()
                          }
                        />
                      ) : (
                        <StreamingMessage
                          key={message.id}
                          content={message.content}
                          isStreaming={false}
                          isSpeaking={false}
                        />
                      )
                    )}

                    {/* Current Streaming Message */}
                    {currentTranscript && (
                      <StreamingMessage
                        content={currentTranscript}
                        isStreaming={isStreaming}
                        isSpeaking={isSpeaking}
                      />
                    )}

                    {/* System Messages */}
                    {sessionState === 'starting' && (
                      <SystemMessage content="Starting session…" type="info" />
                    )}
                    {sessionState === 'ending' && (
                      <SystemMessage content="Ending session…" type="info" />
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
