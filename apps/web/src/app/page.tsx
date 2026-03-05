'use client';


import { Play, Sparkles, Video, MessageSquare, TrendingUp, Shield, Zap, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { LandingNavbar } from '@/components/layout/landing-navbar';


export default function HomePage() {

  return (
    <div className="min-h-screen" style={{ background: 'oklch(1.00 0 0)' }}>
      {/* Landing Navbar */}
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        {/* Background Gradient - Brand Colors */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[900px] bg-gradient-to-b from-blue-600/5 via-purple-600/3 to-transparent rounded-full blur-3xl animate-pulse-slow" />
        </div>

        <div className="relative z-10 container mx-auto px-6 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md mb-8 backdrop-blur-sm transition-all duration-200 animate-fade-in-up" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
              <Sparkles className="w-4 h-4" style={{ color: 'oklch(0.40 0 0)' }} />
              <span className="text-sm font-medium" style={{ color: 'oklch(0.40 0 0)' }}>AI-Powered Interview Coaching</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl lg:text-6xl font-semibold mb-6 tracking-tight leading-tight animate-fade-in-up animation-delay-100" style={{ color: 'oklch(0.20 0 0)' }}>
              Practice Your
              <span className="text-gradient-brand"> Interview Skills</span>
              <br />with Real-Time AI Feedback
            </h1>

            {/* Subtitle */}
            <p className="text-lg mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200" style={{ color: 'oklch(0.45 0 0)' }}>
              Get instant feedback on your confidence, speech patterns, and body language.
              Powered by advanced AI to help you ace your next job interview.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-300">
              <Link
                href="/auth"
                className="px-6 py-3 bg-[#2383e2] hover:bg-[#1a6fb8] text-white font-medium rounded-md transition-all duration-200 shadow-notion hover:shadow-notion-md hover:scale-105 flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Practicing
              </Link>
              <button className="px-6 py-3 font-medium rounded-md transition-all duration-200 hover:scale-105 flex items-center gap-2 border shadow-notion hover:shadow-notion-md" style={{ background: 'oklch(0.97 0 0)', color: 'oklch(0.20 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
                <span>Watch Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Scroll Animation Demo Section */}

      {/* Features Section */}
      <section id="features" className="py-20" style={{ borderTop: '1px solid oklch(0.90 0 0 / 0.5)' }}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-semibold mb-4" style={{ color: 'oklch(0.20 0 0)' }}>
              Everything You Need to
              <span className="text-gradient-brand"> Succeed</span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'oklch(0.45 0 0)' }}>
              Our AI coach analyzes every aspect of your interview performance in real-time
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="group p-6 rounded-md transition-all duration-200 hover:scale-[1.02] hover:shadow-notion-lg backdrop-blur-xl border card-hover">
              <div className="w-12 h-12 rounded-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
                <MessageSquare className="w-6 h-6" style={{ color: 'oklch(0.40 0 0)' }} />
              </div>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'oklch(0.20 0 0)' }}>Real-Time Feedback</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.50 0 0)' }}>
                Get instant AI-powered feedback on your responses, pacing, and content quality
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 rounded-md transition-all duration-200 hover:scale-[1.02] hover:shadow-notion-lg backdrop-blur-xl border card-hover">
              <div className="w-12 h-12 rounded-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
                <TrendingUp className="w-6 h-6" style={{ color: 'oklch(0.40 0 0)' }} />
              </div>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'oklch(0.20 0 0)' }}>Confidence Tracking</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.50 0 0)' }}>
                Monitor your confidence levels, eye contact, posture, and engagement throughout
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 rounded-md transition-all duration-200 hover:scale-[1.02] hover:shadow-notion-lg backdrop-blur-xl border card-hover">
              <div className="w-12 h-12 rounded-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
                <Zap className="w-6 h-6" style={{ color: 'oklch(0.40 0 0)' }} />
              </div>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'oklch(0.20 0 0)' }}>Smart Analysis</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.50 0 0)' }}>
                Advanced AI analyzes your speech patterns, filler words, and delivery style
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Dashboard Section */}
      <section id="demo" className="py-20" style={{ borderTop: '1px solid oklch(0.90 0 0 / 0.5)' }}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-semibold mb-4" style={{ color: 'oklch(0.20 0 0)' }}>
              See It In
              <span className="text-gradient-brand"> Action</span>
            </h2>
            <p className="text-lg" style={{ color: 'oklch(0.45 0 0)' }}>
              Experience our AI-powered interview coaching platform
            </p>
          </div>

          {/* Mock Dashboard */}
          <div className="max-w-6xl mx-auto">
            <div className="backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-elevated hover:scale-[1.01] border">
              {/* Mock Header */}
              <div className="h-16 flex items-center justify-between px-6 backdrop-blur-sm" style={{ background: 'oklch(0.97 0 0 / 0.5)', borderBottom: '1px solid oklch(0.90 0 0 / 0.5)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium" style={{ color: 'oklch(0.20 0 0)' }}>Interview Coach</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.75 0.15 150)' }}>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'oklch(0.65 0.15 150)' }}></div>
                    <span className="text-xs" style={{ color: 'oklch(0.55 0.15 150)' }}>Ready</span>
                  </div>
                  <div className="w-9 h-9 rounded-full border" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.90 0 0)' }}></div>
                </div>
              </div>

              {/* Mock Content */}
              <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x" style={{ borderColor: 'oklch(0.90 0 0 / 0.5)' }}>
                {/* Left Panel - Instructions */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'oklch(0.20 0 0)' }}>How It Works</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.85 0.15 250)' }}>
                        <span className="text-sm font-semibold" style={{ color: 'oklch(0.55 0.20 250)' }}>1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'oklch(0.20 0 0)' }}>Set Job Description</p>
                        <p className="text-xs mt-1" style={{ color: 'oklch(0.55 0 0)' }}>Paste the job posting you're preparing for</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.85 0.15 280)' }}>
                        <span className="text-sm font-semibold" style={{ color: 'oklch(0.55 0.20 280)' }}>2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'oklch(0.20 0 0)' }}>Start Session</p>
                        <p className="text-xs mt-1" style={{ color: 'oklch(0.55 0 0)' }}>Enable camera and microphone for analysis</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.85 0.15 330)' }}>
                        <span className="text-sm font-semibold" style={{ color: 'oklch(0.55 0.20 330)' }}>3</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'oklch(0.20 0 0)' }}>Get Real-Time Feedback</p>
                        <p className="text-xs mt-1" style={{ color: 'oklch(0.55 0 0)' }}>AI analyzes your responses as you practice</p>
                      </div>
                    </div>
                  </div>

                  <button className="w-full mt-6 py-3 font-medium rounded-xl transition-all duration-500 hover:scale-105 hover:shadow-elevated flex items-center justify-center gap-2" style={{ background: 'oklch(0.205 0 0)', color: 'oklch(1.00 0 0)', border: '1px solid oklch(0.105 0 0)' }}>
                    <Play className="w-4 h-4" />
                    Try Demo Session
                  </button>
                </div>

                {/* Center Panel - Preview */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'oklch(0.20 0 0)' }}>Live Preview</h3>
                  <div className="aspect-video rounded-xl border flex items-center justify-center relative overflow-hidden" style={{ background: 'oklch(0.98 0 0)', border: '1px solid oklch(0.90 0 0 / 0.5)' }}>
                    {/* Camera Preview Mock */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'oklch(0.97 0 0)', border: '2px solid oklch(0.90 0 0)' }}>
                          <Video className="w-8 h-8" style={{ color: 'oklch(0.65 0 0)' }} />
                        </div>
                        <p className="text-sm" style={{ color: 'oklch(0.65 0 0)' }}>Camera Preview</p>
                      </div>
                    </div>

                    {/* Mock Confidence Score Overlay */}
                    <div className="absolute top-4 left-4 px-3 py-2 rounded-lg backdrop-blur border" style={{ background: 'oklch(0.98 0 0 / 0.8)', border: '1px solid oklch(0.90 0 0)' }}>
                      <p className="text-xs" style={{ color: 'oklch(0.55 0 0)' }}>Confidence</p>
                      <p className="text-2xl font-semibold" style={{ color: 'oklch(0.20 0 0)' }}>87%</p>
                    </div>

                    {/* Mock Status Indicators */}
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: 'oklch(0.65 0.15 150)' }}></div>
                        <span className="text-xs" style={{ color: 'oklch(0.55 0 0)' }}>Eye Contact: Good</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: 'oklch(0.70 0.15 50)' }}></div>
                        <span className="text-xs" style={{ color: 'oklch(0.55 0 0)' }}>Speech Speed: Moderate</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Stats */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'oklch(0.20 0 0)' }}>Session Stats</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border" style={{ background: 'oklch(0.98 0 0)', border: '1px solid oklch(0.90 0 0 / 0.5)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'oklch(0.55 0 0)' }}>Confidence Score</span>
                        <span className="text-sm font-medium" style={{ color: 'oklch(0.65 0.15 150)' }}>+12%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.95 0 0)' }}>
                        <div className="h-full w-[87%] bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"></div>
                      </div>
                      <p className="text-xs mt-2" style={{ color: 'oklch(0.55 0 0)' }}>Above average</p>
                    </div>

                    <div className="p-4 rounded-xl border" style={{ background: 'oklch(0.98 0 0)', border: '1px solid oklch(0.90 0 0 / 0.5)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'oklch(0.55 0 0)' }}>Speech Clarity</span>
                        <span className="text-sm font-medium" style={{ color: 'oklch(0.55 0.20 250)' }}>Good</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.95 0 0)' }}>
                        <div className="h-full w-[78%] bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"></div>
                      </div>
                      <p className="text-xs mt-2" style={{ color: 'oklch(0.55 0 0)' }}>Clear articulation</p>
                    </div>

                    <div className="p-4 rounded-xl border" style={{ background: 'oklch(0.98 0 0)', border: '1px solid oklch(0.90 0 0 / 0.5)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'oklch(0.55 0 0)' }}>Engagement</span>
                        <span className="text-sm font-medium" style={{ color: 'oklch(0.55 0.20 280)' }}>High</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.95 0 0)' }}>
                        <div className="h-full w-[92%] bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"></div>
                      </div>
                      <p className="text-xs mt-2" style={{ color: 'oklch(0.55 0 0)' }}>Excellent participation</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock Transcript */}
              <div className="p-6 backdrop-blur-sm" style={{ background: 'oklch(0.97 0 0 / 0.3)', borderTop: '1px solid oklch(0.90 0 0 / 0.5)' }}>
                <h3 className="text-sm font-medium mb-4" style={{ color: 'oklch(0.45 0 0)' }}>Live Transcript</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.90 0 0)' }}>
                      <span className="text-xs" style={{ color: 'oklch(0.55 0 0)' }}>AI</span>
                    </div>
                    <div className="flex-1 p-3 rounded-xl border" style={{ background: 'oklch(0.98 0 0)', border: '1px solid oklch(0.90 0 0 / 0.5)' }}>
                      <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Tell me about yourself and your background.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-white">You</span>
                    </div>
                    <div className="flex-1 p-3 rounded-xl border" style={{ background: 'oklch(0.98 0 0)', border: '1px solid oklch(0.85 0.15 250)' }}>
                      <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>I'm a software engineer with 5 years of experience in full-stack development...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20" style={{ borderTop: '1px solid oklch(0.90 0 0 / 0.5)' }}>
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl font-semibold mb-6" style={{ color: 'oklch(0.20 0 0)' }}>
                Why Choose Our
                <span className="text-gradient-brand"> AI Coach?</span>
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.75 0.15 150)' }}>
                    <Check className="w-5 h-5" style={{ color: 'oklch(0.65 0.15 150)' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'oklch(0.20 0 0)' }}>Real-Time Analysis</h3>
                    <p style={{ color: 'oklch(0.45 0 0)' }}>Get instant feedback as you speak, not after the fact</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.85 0.15 250)' }}>
                    <Shield className="w-5 h-5" style={{ color: 'oklch(0.55 0.20 250)' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'oklch(0.20 0 0)' }}>Privacy First</h3>
                    <p style={{ color: 'oklch(0.45 0 0)' }}>Your sessions are private and never shared</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.85 0.15 280)' }}>
                    <Zap className="w-5 h-5" style={{ color: 'oklch(0.55 0.20 280)' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'oklch(0.20 0 0)' }}>AI-Powered Insights</h3>
                    <p style={{ color: 'oklch(0.45 0 0)' }}>Advanced algorithms that understand context and nuance</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl rounded-2xl p-8 transition-all duration-500 hover:scale-105 border" style={{ background: 'oklch(0.98 0 0 / 0.3)', border: '1px solid oklch(0.90 0 0 / 0.5)' }}>
              <h3 className="text-xl font-semibold mb-6" style={{ color: 'oklch(0.20 0 0)' }}>Ready to Ace Your Interview?</h3>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3" style={{ color: 'oklch(0.45 0 0)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'oklch(0.65 0.15 150)' }}></div>
                  Practice with real interview questions
                </li>
                <li className="flex items-center gap-3" style={{ color: 'oklch(0.45 0 0)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'oklch(0.65 0.15 150)' }}></div>
                  Improve your confidence and delivery
                </li>
                <li className="flex items-center gap-3" style={{ color: 'oklch(0.45 0 0)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'oklch(0.65 0.15 150)' }}></div>
                  Get detailed performance reports
                </li>
                <li className="flex items-center gap-3" style={{ color: 'oklch(0.45 0 0)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'oklch(0.65 0.15 150)' }}></div>
                  Track your progress over time
                </li>
              </ul>
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-500 hover:scale-105 shadow-lg"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ borderTop: '1px solid oklch(0.90 0 0 / 0.5)' }}>
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center backdrop-blur-xl rounded-3xl p-12 transition-all duration-500 hover:scale-[1.02] border bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.90 0 0 / 0.5)' }}>
            <h2 className="text-3xl lg:text-4xl font-semibold mb-4" style={{ color: 'oklch(0.20 0 0)' }}>
              Start Practicing Today
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: 'oklch(0.45 0 0)' }}>
              Join thousands of job seekers who've improved their interview skills with our AI coach
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-500 hover:scale-105 shadow-lg"
            >
              <Play className="w-5 h-5" />
              Start Your Free Session
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8" style={{ borderTop: '1px solid oklch(0.90 0 0 / 0.5)', background: 'oklch(0.98 0 0)' }}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium" style={{ color: 'oklch(0.20 0 0)' }}>Live Interview Coach</span>
            </div>
            <p className="text-sm" style={{ color: 'oklch(0.65 0 0)' }}>
              © 2025 Live Interview Coach. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
