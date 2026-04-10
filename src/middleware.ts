import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/** Set to `false` to reopen the site (single-line toggle). */
const SITE_PRIVATE = true;

export async function middleware(request: NextRequest) {
  if (SITE_PRIVATE) {
    const url = request.nextUrl.clone();
    url.pathname = '/closed';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run middleware for app routes only — not /closed (avoid redirect loop),
     * not Next internals, favicon, or common static image extensions.
     */
    '/((?!_next/static|_next/image|favicon.ico|closed(?:/.*)?$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
