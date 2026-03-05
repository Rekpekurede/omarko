'use client';

import { DrawerProvider } from '@/context/DrawerContext';
import { SideDrawer } from './SideDrawer';
import { MobileBottomNav } from './MobileBottomNav';

interface AppShellProps {
  header: React.ReactNode;
  username: string | null;
  avatarUrl: string | null;
  isSignedIn: boolean;
  children: React.ReactNode;
}

export function AppShell({ header, username, avatarUrl, isSignedIn, children }: AppShellProps) {
  return (
    <DrawerProvider>
      {header}
      <SideDrawer username={username} avatarUrl={avatarUrl} />
      <main className="pb-24 pt-4 sm:pb-8 sm:pt-6">{children}</main>
      <MobileBottomNav isSignedIn={isSignedIn} username={username} />
    </DrawerProvider>
  );
}
