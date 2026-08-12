/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F1720",
          surface: "#16212C",
          raised: "#1C2933",
          border: "#28353F",
        },
        seal: {
          DEFAULT: "#C9A227",
          light: "#E0C158",
          dim: "#8A711F",
        },
        approve: {
          DEFAULT: "#3FA873",
          bg: "#173226",
        },
        reject: {
          DEFAULT: "#C15B4A",
          bg: "#331F1A",
        },
        paper: {
          DEFAULT: "#E8E6DF",
          muted: "#8B95A1",
          dim: "#5C6672",
        },
      },
      fontFamily: {
        serif: ["'Source Serif 4'", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
