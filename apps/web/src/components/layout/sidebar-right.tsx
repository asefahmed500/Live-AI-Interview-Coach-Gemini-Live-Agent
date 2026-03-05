'use client';

import { useInterviewStore } from '@/store';
import { cn, getConfidenceColor, getConfidenceBg } from '@/lib/utils';
import { useAuthStore } from '@/store/use-auth-store';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { SessionHistory } from './session-history';

export function SidebarRight() {
  const { confidence, sidebarOpen } = useInterviewStore();
  const { isAuthenticated } = useAuthStore();

  if (!sidebarOpen) return null;

  const history = confidence?.history || [];

  // Calculate confidence statistics
  const avgConfidence =
    history.length > 0
      ? Math.round(history.reduce((a: number, b: number) => a + b, 0) / history.length)
      : 0;
  const maxConfidence = history.length > 0 ? Math.max(...history) : 0;
  const minConfidence = history.length > 0 ? Math.min(...history) : 0;

  return (
    <aside className="fixed top-16 right-0 bottom-0 w-72 bg-slate-900 border-l border-slate-800 overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Confidence
          </h2>
          <Activity className="w-4 h-4 text-slate-500" />
        </div>

        {/* Current Confidence Score */}
        <div
          className={cn(
            'relative p-6 rounded-xl border-2 transition-all duration-300',
            getConfidenceBg(confidence.score)
          )}
        >
          {/* Trend Icon */}
          <div className="absolute top-4 right-4">
            {confidence.trend === 'up' && (
              <TrendingUp className={cn('w-5 h-5', getConfidenceColor(confidence.score))} />
            )}
            {confidence.trend === 'down' && (
              <TrendingDown className={cn('w-5 h-5', getConfidenceColor(confidence.score))} />
            )}
            {confidence.trend === 'stable' && <Minus className="w-5 h-5 text-slate-500" />}
          </div>

          {/* Score */}
          <div className="flex items-end gap-2">
            <span className={cn('text-5xl font-bold', getConfidenceColor(confidence.score))}>
              {confidence.score}
            </span>
            <span className="text-lg text-slate-400 mb-2">%</span>
          </div>

          {/* Label */}
          <p className="text-sm text-slate-400 mt-2">Current Confidence</p>

          {/* Last Updated */}
          <p className="text-xs text-slate-500 mt-1">
            Updated{' '}
            {confidence?.lastUpdated
              ? new Date(confidence.lastUpdated).toLocaleTimeString()
              : 'Never'}
          </p>
        </div>

        {/* Confidence Statistics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Average</p>
            <p className={cn('text-lg font-semibold', getConfidenceColor(avgConfidence))}>
              {avgConfidence}%
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Highest</p>
            <p className={cn('text-lg font-semibold', getConfidenceColor(maxConfidence))}>
              {maxConfidence}%
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Lowest</p>
            <p className={cn('text-lg font-semibold', getConfidenceColor(minConfidence))}>
              {minConfidence}%
            </p>
          </div>
        </div>

        {/* Confidence History Chart */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide">History</h3>
          <div className="bg-slate-800/50 rounded-lg p-4">
            {confidence.history.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No confidence data yet</p>
            ) : (
              <div className="space-y-1">
                {confidence.history.slice(-20).map((score: number, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-8">
                      {confidence.history.length - 20 + index + 1}
                    </span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          score >= 70 && 'bg-green-400',
                          score >= 40 && score < 70 && 'bg-yellow-400',
                          score < 40 && 'bg-red-400'
                        )}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium w-10 text-right',
                        getConfidenceColor(score)
                      )}
                    >
                      {score}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Confidence Tips */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-400 mb-2">Tips for Improvement</h3>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Maintain eye contact with camera</li>
            <li>• Speak clearly and at a steady pace</li>
            <li>• Use confident body language</li>
            <li>• Take brief pauses to collect thoughts</li>
          </ul>
        </div>

        {/* Session Info */}
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Session Details
          </h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Mode:</span>
              <span className="text-slate-300 capitalize">{useInterviewStore.getState().mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Difficulty:</span>
              <span className="text-slate-300 capitalize">
                {useInterviewStore.getState().difficulty || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Data Points:</span>
              <span className="text-slate-300">{confidence.history.length}</span>
            </div>
          </div>
        </div>

        {/* Session History */}
        {isAuthenticated && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Your Sessions
            </h3>
            <SessionHistory />
          </div>
        )}
      </div>
    </aside>
  );
}
