'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { sessionsApi, type Session, type SessionStatistics } from '@/lib/sessions-api';
import { useAuthStore } from '@/store/use-auth-store';
import { Clock, TrendingUp, MessageSquare, Target, Play, BarChart3, Loader2 } from 'lucide-react';

export function SessionHistory() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [statistics, setStatistics] = useState<SessionStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'stats'>('history');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [sessionsData, statsData] = await Promise.all([
        sessionsApi.getSessions({ includeCompleted: true, limit: 20 }),
        sessionsApi.getStatistics().catch(() => null),
      ]);
      setSessions(sessionsData.sessions);
      setStatistics(statsData);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSession = (session: Session) => {
    router.push(`/?resume=${session.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getJobTitle = (jobDescription: string) => {
    const firstLine = jobDescription.split('\n')[0];
    return firstLine.length > 50
      ? firstLine.substring(0, 50) + '…'
      : firstLine || 'Untitled Session';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400';
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* User Info & Logout */}
      <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2383e2] to-[#0d47a1] flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
            activeTab === 'history'
              ? 'bg-white/[0.06] text-white'
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
            activeTab === 'stats'
              ? 'bg-white/[0.06] text-white'
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          Statistics
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'history' ? (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-sm text-slate-500">No sessions yet</p>
                <p className="text-xs text-slate-600 mt-1">Start your first interview</p>
              </div>
            ) : (
              sessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="group p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                  onClick={() => handleResumeSession(session)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusColor(
                            session.status
                          )}`}
                        >
                          {session.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(session.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-white truncate">
                        {getJobTitle(session.jobDescription)}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {session.transcript.length}
                        </span>
                        {session.confidenceHistory.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {Math.round(
                              (session.confidenceHistory.reduce((a, b) => a + b, 0) /
                                session.confidenceHistory.length) *
                                100
                            )}
                            %
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResumeSession(session);
                      }}
                      className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 opacity-0 group-hover:opacity-100 transition-all"
                      aria-label="Resume session"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/20">
                    <Clock className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-xs text-slate-500">Total</span>
                </div>
                <p className="text-2xl font-semibold text-white">{statistics?.total || 0}</p>
              </div>
              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-green-500/20">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-xs text-slate-500">Completed</span>
                </div>
                <p className="text-2xl font-semibold text-white">{statistics?.completed || 0}</p>
              </div>
              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-yellow-500/20">
                    <Target className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-xs text-slate-500">Avg. Confidence</span>
                </div>
                <p className="text-2xl font-semibold text-white">
                  {statistics?.averageConfidence
                    ? Math.round(statistics.averageConfidence * 100)
                    : 0}
                  %
                </p>
              </div>
              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-xs text-slate-500">Active</span>
                </div>
                <p className="text-2xl font-semibold text-white">{statistics?.active || 0}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
