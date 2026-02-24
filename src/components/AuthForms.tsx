'use client';

import { useFormState } from 'react-dom';
import { signIn, signUp } from '@/lib/actions';

export function AuthForms() {
  const [signInState, signInAction] = useFormState(signIn, null);
  const [signUpState, signUpAction] = useFormState(signUp, null);

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div className="space-y-4 rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold">Sign in</h2>
        <form action={signInAction} className="space-y-3">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-black placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-black placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          {signInState?.error && (
            <p className="text-sm text-red-600">{signInState.error}</p>
          )}
          <button
            type="submit"
            className="w-full rounded border border-black bg-black py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign in
          </button>
        </form>
      </div>
      <div className="space-y-4 rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold">Sign up</h2>
        <form action={signUpAction} className="space-y-3">
          <input
            name="username"
            type="text"
            placeholder="Username"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-black placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-black placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          <input
            name="password"
            type="password"
            placeholder="Password (min 6 chars)"
            required
            minLength={6}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-black placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          {signUpState?.error && (
            <p className="text-sm text-red-600">{signUpState.error}</p>
          )}
          <button
            type="submit"
            className="w-full rounded border border-black bg-black py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign up
          </button>
        </form>
      </div>
    </div>
  );
}
