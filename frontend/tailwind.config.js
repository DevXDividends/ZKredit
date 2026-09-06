/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#050505",
          surface: "#0D0D0D",
          raised: "#141414",
          border: "#232323",
          soft: "#1A1A1A",
        },
        paper: {
          DEFAULT: "#F5F5F3",
          muted: "#A8A8A4",
          dim: "#6B6B68",
        },
        accent: {
          DEFAULT: "#FFFFFF",
          dim: "#D4D4D2",
        },
        approve: {
          DEFAULT: "#3DDC84",
          bg: "#0E1F16",
          soft: "#12291D",
        },
        reject: {
          DEFAULT: "#FF5C5C",
          bg: "#231010",
          soft: "#2B1414",
        },
        pending: {
          DEFAULT: "#FFC857",
          bg: "#241D0C",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
        "radial-fade": "radial-gradient(ellipse at center, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0) 70%)",
      },
      backgroundSize: {
        grid: "44px 44px",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        stamp: {
          "0%": { opacity: "0", transform: "scale(1.9) rotate(-14deg)" },
          "60%": { opacity: "1", transform: "scale(0.94) rotate(-8deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-8deg)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spin-slow 14s linear infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "fade-up": "fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        stamp: "stamp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        marquee: "marquee 26s linear infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.2, 0.6, 0.4, 1) infinite",
      },
    },
  },
  plugins: [],
};
