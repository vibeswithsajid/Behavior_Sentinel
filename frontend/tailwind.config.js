/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light theme foundations
        surface:    "#F8FAFC",
        "surface-2": "#F1F5F9",
        card:       "#FFFFFF",
        "card-hover": "#FAFAFA",
        border:     "#E2E8F0",
        "border-hover": "#CBD5E1",
        // Text
        primary:    "#0F172A",
        secondary:  "#64748B",
        tertiary:   "#94A3B8",
        // Accent
        accent:     "#2563EB",
        "accent-hover": "#1D4ED8",
        "accent-light": "#EFF6FF",
        "accent-muted": "#BFDBFE",
        // Status colors — used sparingly
        critical:   "#DC2626",
        "critical-bg": "#FEF2F2",
        "critical-border": "#FECACA",
        high:       "#EA580C",
        "high-bg":  "#FFF7ED",
        "high-border": "#FED7AA",
        medium:     "#D97706",
        "medium-bg": "#FFFBEB",
        "medium-border": "#FDE68A",
        low:        "#16A34A",
        "low-bg":   "#F0FDF4",
        "low-border": "#BBF7D0",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        "card": "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        "card-md": "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        "dropdown": "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
