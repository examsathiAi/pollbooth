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
          50: "#f9f3ee",
          100: "#f2e7dc",
          500: "#7a1f10",
          600: "#6d1b0d",
          700: "#5c1709",
          900: "#2b120d",
        },
        paper: {
          bg: "#f4efe7",
          card: "#fffdf9",
          border: "#d8ceb8",
          borderStrong: "#c7bba5",
        },
        ink: {
          DEFAULT: "#1f1b18",
          muted: "#625a50",
        },
        maroon: {
          DEFAULT: "#7a1f10",
          dark: "#5c1709",
        },
      },
      boxShadow: {
        fb: "0 1px 2px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(24, 119, 242, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
