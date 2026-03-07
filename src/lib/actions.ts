'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function signUp(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const username = formData.get('username') as string;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: username || undefined } },
  });
  if (error) return { error: error.message };
  redirect('/auth?message=Check your email to confirm');
}

export async function signIn(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  let result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error) {
    const isEmailNotConfirmed =
      result.error.message?.toLowerCase().includes('email not confirmed') ||
      result.error.message?.toLowerCase().includes('email_not_confirmed');
    if (isEmailNotConfirmed) {
      await new Promise((r) => setTimeout(r, 1500));
      result = await supabase.auth.signInWithPassword({ email, password });
    }
    if (result.error) {
      const message = isEmailNotConfirmed
        ? 'If you just confirmed your email, try again in a few seconds. Otherwise check your inbox and click the confirmation link, then sign in.'
        : result.error.message;
      return { error: message };
    }
  }
  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

