'use client';

import { DrawerProvider } from '@/context/DrawerContext';
import { SideDrawer } from './SideDrawer';
import { MobileBottomNav } from './MobileBottomNav';
import { usePathname } from 'next/navigation';

interface AppShellProps {
  header: React.ReactNode;
  username: string | null;
  avatarUrl: string | null;
  isSignedIn: boolean;
  children: React.ReactNode;
}

export function AppShell({ header, username, avatarUrl, isSignedIn, children }: AppShellProps) {
  const pathname = usePathname();
  const isAuthRoute = pathname === '/auth' || pathname.startsWith('/auth/');

  // The /auth page is a standalone landing + auth marketing screen.
  // Do not render the shared header/drawer/bottom-nav there.
  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <DrawerProvider>
      {header}
      <SideDrawer username={username} avatarUrl={avatarUrl} />
      <main className="pb-24 pt-8 sm:pb-8 sm:pt-8">{children}</main>
      <MobileBottomNav isSignedIn={isSignedIn} username={username} />
    </DrawerProvider>
  );
}
