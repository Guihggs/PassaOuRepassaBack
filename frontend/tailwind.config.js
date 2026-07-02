/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0B0A1F",
        panel: "#161335",
        volt: "#F4E409",
        magenta: "#FF2E8C",
        cyan: "#20E3D2",
      },
      fontFamily: {
        display: ["'Fredoka'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0px 0px rgba(244,228,9,0.5)" },
          "50%": { boxShadow: "0 0 40px 12px rgba(244,228,9,0.5)" },
        },
        popIn: {
          "0%": { transform: "scale(0.7)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 1.4s ease-in-out infinite",
        popIn: "popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      },
    },
  },
  plugins: [],
};
