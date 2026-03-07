import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.session) {
      const redirectUrl = `${origin}${next}`;
      const res = NextResponse.redirect(redirectUrl);
      return res;
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=Could not sign in`);
}
