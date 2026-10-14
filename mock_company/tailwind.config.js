/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        corp: {
          bg: "#09090b",
          surface: "#121215",
          card: "#18181b",
          border: "#27272a",
          primary: "#f4f4f5",
          accent: "#a1a1aa",
          danger: "#ef4444",
          warning: "#e4e4e7",
          success: "#d4d4d8",
        }
      },
      fontFamily: {
        sans: ["Geist Mono", "JetBrains Mono", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Geist Mono", "Menlo", "monospace"],
      }
    },
  },
  plugins: [],
}
