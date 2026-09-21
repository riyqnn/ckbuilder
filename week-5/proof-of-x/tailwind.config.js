/** @type {import('tailwindcss').Config} */
export default {
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
        ckb: {
          green: "#00CC9B",
          dark: "#0F172A",
          card: "#1E293B",
          border: "#334155",
          accent: "#38BDF8",
        },
      },
    },
  },
  plugins: [],
};
