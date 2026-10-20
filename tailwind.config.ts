import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef4ff", 100: "#dbe6ff", 500: "#4f6bff", 600: "#3b54e6", 700: "#2f43b8", 900: "#1b2560" },
        ink: { 900: "#0f172a", 700: "#334155", 500: "#64748b", 300: "#cbd5e1", 100: "#f1f5f9" },
      },
      fontFamily: { sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"], mono: ["JetBrains Mono", "Consolas", "monospace"] },
      boxShadow: { card: "0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)" },
    },
  },
  plugins: [],
} satisfies Config;
