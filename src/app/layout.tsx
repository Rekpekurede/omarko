import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CreateMarkModalProvider } from "@/context/CreateMarkModalContext";
import { CreateMarkModal } from "@/components/CreateMarkModal";
import { createClient } from "@/lib/supabase/server";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const themeScript = `(function(){var t=localStorage.getItem('omarko-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');})();`;

export const metadata: Metadata = {
  title: { default: "Omarko", template: "%s | Omarko" },
  description: "Create and challenge timestamped claims.",
  applicationName: "Omarko",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Omarko",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let username: string | null = null;
  let avatarUrl: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    username = profile?.username ?? null;
    avatarUrl = profile?.avatar_url ?? null;
  }
  const isSignedIn = !!user;

  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <ThemeProvider>
          <CreateMarkModalProvider>
            <AppShell header={<Header />} username={username} avatarUrl={avatarUrl} isSignedIn={isSignedIn}>
              {children}
            </AppShell>
            <CreateMarkModal />
          </CreateMarkModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
