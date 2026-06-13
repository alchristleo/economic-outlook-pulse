import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        economist: {
          red: '#E3120B',
          dark: '#121212',
          ink: '#1A1A1A',
          paper: '#F8F4EC',
          rule: '#CC0001',
        },
      },
    },
  },
  plugins: [],
};
export default config;
