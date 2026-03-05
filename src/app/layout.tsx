import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CreateMarkModalProvider } from "@/context/CreateMarkModalContext";
import { CreateMarkModal } from "@/components/CreateMarkModal";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { createClient } from "@/lib/supabase/server";

const themeScript = `(function(){var t=localStorage.getItem('omarko-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);})();`;

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
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();
    username = profile?.username ?? null;
  }
  const isSignedIn = !!user;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <CreateMarkModalProvider>
            <Header brandFontClass="font-display" />
            <CreateMarkModal />
            <main className="pb-24 pt-4 sm:pb-8 sm:pt-6">{children}</main>
            <MobileBottomNav isSignedIn={isSignedIn} username={username} />
          </CreateMarkModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
