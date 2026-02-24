import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });

const themeScript = `(function(){var t=localStorage.getItem('omarko-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);})();`;

export const metadata: Metadata = {
  title: "OMarko — Social Claims",
  description: "Create and challenge timestamped claims.",
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
