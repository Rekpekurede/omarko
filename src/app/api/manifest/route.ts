import { NextRequest, NextResponse } from 'next/server';

/**
 * Serves the web app manifest with absolute icon URLs so Chrome and DevTools
 * resolve and display the Icons section reliably (relative URLs can fail in some contexts).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  let origin = url.origin;
  if (!origin) {
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    origin = host ? `${proto}://${host}` : 'https://omarko.vercel.app';
  }

  const manifest = {
    id: '/',
    name: 'OMarko',
    short_name: 'OMarko',
    description: 'Create and challenge timestamped claims.',
    start_url: '/',
    scope: '/',
    display: 'standalone' as const,
    background_color: '#08080C',
    theme_color: '#f59e0b',
    icons: [
      {
        src: `${origin}/icons/icon-192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any' as const,
      },
      {
        src: `${origin}/icons/icon-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any' as const,
      },
      {
        src: `${origin}/icons/icon-512-maskable.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable' as const,
      },
    ],
    screenshots: [
      {
        src: `${origin}/screenshots/wide.png`,
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide' as const,
        label: 'OMarko on desktop',
      },
      {
        src: `${origin}/screenshots/narrow.png`,
        sizes: '750x1334',
        type: 'image/png',
        form_factor: 'narrow' as const,
        label: 'OMarko on mobile',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
