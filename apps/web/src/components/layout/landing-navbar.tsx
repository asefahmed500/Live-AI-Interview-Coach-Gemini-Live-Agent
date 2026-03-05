'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Menu, X, Sparkles } from 'lucide-react';

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? ''
          : 'bg-transparent'
      )}
      style={
        isScrolled
          ? { background: 'oklch(1.00 0 0 / 0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid oklch(0.92 0 0)' }
          : undefined
      }
    >
      <nav className="container mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-200 group-hover:scale-105" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
            <Sparkles className="w-4 h-4" style={{ color: 'oklch(0.40 0 0)' }} />
          </div>
          <span className="font-medium text-sm tracking-tight" style={{ color: 'oklch(0.20 0 0)' }}>
            Interview Coach
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <a
            href="#features"
            className="text-sm font-medium transition-all duration-150 hover-notion rounded-md px-2 py-1"
            style={{ color: 'oklch(0.40 0 0)' }}
          >
            Features
          </a>
          <a
            href="#demo"
            className="text-sm font-medium transition-all duration-150 hover-notion rounded-md px-2 py-1"
            style={{ color: 'oklch(0.40 0 0)' }}
          >
            Demo
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium transition-all duration-150 hover-notion rounded-md px-2 py-1"
            style={{ color: 'oklch(0.40 0 0)' }}
          >
            Pricing
          </a>
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth"
            className="text-sm font-medium transition-all duration-150 hover-notion rounded-md px-3 py-1.5"
            style={{ color: 'oklch(0.40 0 0)' }}
          >
            Sign In
          </Link>
          <Link
            href="/auth"
            className="px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 shadow-notion hover:shadow-notion-md"
            style={{ background: 'oklch(0.97 0 0)', color: 'oklch(0.20 0 0)', border: '1px solid oklch(0.92 0 0)' }}
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-md transition-all duration-200"
          style={{ background: isMobileMenuOpen ? 'oklch(0.97 0 0)' : 'transparent' }}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" style={{ color: 'oklch(0.20 0 0)' }} /> : <Menu className="w-4 h-4" style={{ color: 'oklch(0.40 0 0)' }} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden" style={{ borderTop: '1px solid oklch(0.92 0 0)', background: 'oklch(1.00 0 0 / 0.95)', backdropFilter: 'blur(20px)' }}>
          <div className="container mx-auto px-6 py-4 space-y-3">
            <a
              href="#features"
              className="block text-sm font-medium transition-all duration-150 hover-notion rounded-md px-3 py-2"
              style={{ color: 'oklch(0.40 0 0)' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#demo"
              className="block text-sm font-medium transition-all duration-150 hover-notion rounded-md px-3 py-2"
              style={{ color: 'oklch(0.40 0 0)' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Demo
            </a>
            <a
              href="#pricing"
              className="block text-sm font-medium transition-all duration-150 hover-notion rounded-md px-3 py-2"
              style={{ color: 'oklch(0.40 0 0)' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </a>
            <div className="pt-3 space-y-2" style={{ borderTop: '1px solid oklch(0.92 0 0)' }}>
              <Link
                href="/auth"
                className="block text-sm font-medium transition-all duration-150 hover-notion rounded-md px-3 py-2"
                style={{ color: 'oklch(0.40 0 0)' }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/auth"
                className="block px-4 py-2 text-sm font-medium rounded-md text-center transition-all duration-200 shadow-notion"
                style={{ background: 'oklch(0.97 0 0)', color: 'oklch(0.20 0 0)', border: '1px solid oklch(0.92 0 0)' }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
