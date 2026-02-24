import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sora.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-white text-black antialiased dark:bg-gray-950 dark:text-gray-100">
        <ThemeProvider>
          <Header brandFontClass={sora.className} />
          <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
