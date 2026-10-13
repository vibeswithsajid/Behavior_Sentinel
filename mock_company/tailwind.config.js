/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        corp: {
          bg: "#0b1329",
          surface: "#111c38",
          card: "#172346",
          border: "#253560",
          primary: "#3b82f6",
          accent: "#06b6d4",
          danger: "#ef4444",
          warning: "#f59e0b",
          success: "#10b981",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      }
    },
  },
  plugins: [],
}
