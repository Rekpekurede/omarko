import Link from 'next/link';
import { AuthForms } from '@/components/AuthForms';

interface PageProps {
  searchParams: Promise<{ message?: string; error?: string }>;
}

export default async function AuthPage({ searchParams }: PageProps) {
  const { message, error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-2xl font-bold">Sign in / Sign up</h1>
      {message && (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <AuthForms />
      <p className="text-center text-sm text-gray-500">
        <Link href="/" className="hover:underline">Back to feed</Link>
      </p>
    </div>
  );
}
