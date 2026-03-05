import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        border: "var(--border)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
      },
      fontFamily: {
        sans: ["'Cormorant Garamond'", "Georgia", "serif"],
        display: ["'Cormorant Garamond'", "Georgia", "serif"],
        mono: ["'DM Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "glow-sm": "0 0 24px var(--primary-glow)",
        "glow-md": "0 0 40px var(--primary-glow)",
      },
      animation: {
        "breathing-glow": "breathing-glow 4s ease-in-out infinite",
      },
      keyframes: {
        "breathing-glow": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.02)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
