import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CreateMarkModalProvider } from "@/context/CreateMarkModalContext";
import { CreateMarkModal } from "@/components/CreateMarkModal";
import { PwaRegister } from "@/components/PwaRegister";
import { createClient } from "@/lib/supabase/server";
import { PostHogProvider } from "@/components/PostHogProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const themeScript = `(function(){var t=localStorage.getItem('omarko-theme')||'system';if(t==='cobrain'){document.documentElement.setAttribute('data-theme','cobrain');}else{var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}})();`;

export const metadata: Metadata = {
  title: "OMarko",
  description: "Leave your mark on the world.",
  applicationName: "OMarko",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "OMarko",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/omarko-logo-dark.png",
    apple: "/omarko-logo-dark.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#09090b",
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
    <html lang="en" className={`${playfair.variable} ${plusJakarta.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <PwaRegister />
        <PostHogProvider>
          <ThemeProvider>
            <CreateMarkModalProvider>
              <AppShell header={<Header />} username={username} avatarUrl={avatarUrl} isSignedIn={isSignedIn}>
                {children}
              </AppShell>
              <CreateMarkModal username={username} />
            </CreateMarkModalProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
