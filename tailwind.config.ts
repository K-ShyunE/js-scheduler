import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#fbf9f8",
        "surface-main": "#fbf9f8",
        "surface-card": "#ffffff",
        "surface-container": "#efedec",
        "surface-container-low": "#f5f3f2",
        "surface-container-high": "#e9e8e7",
        "border-subtle": "#e5e1e0",
        primary: "#a93539",
        "primary-action": "#f06a6a",
        "primary-soft": "#fff0ef",
        secondary: "#5f6368",
        tertiary: "#006c48",
        "tertiary-soft": "#e8f8f1",
        "broadcast-blue": "#1a73e8",
        "text-heading": "#202124",
        "text-body": "#5f6368",
        error: "#ba1a1a",
      },
      fontFamily: {
        sans: ["Hanken Grotesk", "Inter", "system-ui", "sans-serif"],
        data: ["Inter", "Hanken Grotesk", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 12px 30px rgba(65, 0, 6, 0.07)",
      },
    },
  },
  plugins: [],
} satisfies Config;

