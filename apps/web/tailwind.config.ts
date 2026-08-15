import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ["var(--font-headline)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "-apple-system", "sans-serif"],
      },
      colors: {
        pollbooth: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
        paper: {
          bg: "#e8e1cc",
          card: "#f5f1e6",
          border: "#b8b3a0",
          borderStrong: "#a89f85",
        },
        ink: {
          DEFAULT: "#171512",
          muted: "#5c5541",
        },
        maroon: {
          DEFAULT: "#7a1f10",
          dark: "#5c1709",
        },
      },
    },
  },
  plugins: [],
};

export default config;
