'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormState } from 'react-dom';
import { signIn, signUp } from '@/lib/actions';
import { captureEvent } from '@/lib/posthog-client';

const inputClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 font-body text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none';

const btnClass =
  'w-full cursor-pointer rounded-lg bg-[var(--accent)] py-3 font-body font-semibold text-[var(--bg-primary)] transition-colors hover:bg-[var(--accent-dim)]';

interface AuthFormsProps {
  message?: string | null;
  error?: string | null;
}

export function AuthForms({ message, error }: AuthFormsProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [signInState, signInAction] = useFormState(signIn, null);
  const [signUpState, signUpAction] = useFormState(signUp, null);

  const signInError = signInState?.error ?? null;
  const signUpError = signUpState?.error ?? null;

  return (
    <div className="w-full max-w-sm">
      <p className="font-display text-[1.5rem] font-semibold text-[var(--text-primary)]">
        Join OMarko
      </p>
      <p className="mt-1 font-body text-[0.9rem] italic text-[var(--text-secondary)]">
        Start leaving your mark on the world.
      </p>

      {message && (
        <p className="mt-4 rounded-lg border border-[var(--accent)] bg-[var(--accent-glow)] p-3 font-body text-sm text-[var(--text-primary)]">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 font-body text-sm text-[var(--accent)]">{error}</p>
      )}

      {/* Tab switcher — Sign In / Sign Up */}
      <div className="mt-6 flex gap-1 rounded-lg border border-[var(--border)] bg-transparent p-1">
        <button
          type="button"
          onClick={() => setTab('signin')}
          className={`flex-1 rounded-md px-4 py-2 font-body text-sm font-medium transition-colors ${
            tab === 'signin'
              ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setTab('signup')}
          className={`flex-1 rounded-md px-4 py-2 font-body text-sm font-medium transition-colors ${
            tab === 'signup'
              ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Sign Up
        </button>
      </div>

      {tab === 'signin' && (
        <form
          action={signInAction}
          className="mt-6 space-y-4"
          onSubmit={() => captureEvent('user_signed_in')}
        >
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className={inputClass}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className={inputClass}
          />
          {signInError && (
            <p className="font-body text-sm text-[var(--accent)]">{signInError}</p>
          )}
          <button type="submit" className={btnClass}>
            Sign In
          </button>
          <p className="text-center font-body text-[0.8rem] text-[var(--text-muted)]">
            <Link href="#" className="hover:text-[var(--text-primary)] hover:underline">
              Forgot password?
            </Link>
          </p>
        </form>
      )}

      {tab === 'signup' && (
        <form
          action={signUpAction}
          className="mt-6 space-y-4"
          onSubmit={() => captureEvent('user_signed_up')}
        >
          <input
            name="username"
            type="text"
            placeholder="Username"
            className={inputClass}
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className={inputClass}
          />
          <input
            name="password"
            type="password"
            placeholder="Password (min 6 chars)"
            required
            minLength={6}
            className={inputClass}
          />
          {signUpError && (
            <p className="font-body text-sm text-[var(--accent)]">{signUpError}</p>
          )}
          <button type="submit" className={btnClass}>
            Create Account
          </button>
          <p className="text-center font-body text-[0.75rem] text-[var(--text-muted)]">
            By signing up you agree to use OMarko in good faith.
          </p>
        </form>
      )}
    </div>
  );
}
