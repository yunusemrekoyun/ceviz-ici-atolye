import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#06070A",
          900: "#0B0D12",
          800: "#11141B",
          700: "#181C25",
          600: "#222732",
          500: "#2D3340",
        },
        neon: {
          DEFAULT: "#C6FF3D",
          50: "#F4FFD9",
          100: "#E6FFA8",
          400: "#D6FF66",
          500: "#C6FF3D",
          600: "#A8E020",
          700: "#7FAA15",
        },
        accent: {
          cyan: "#22D3EE",
          violet: "#8B5CF6",
          pink: "#F472B6",
          amber: "#F59E0B",
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "radial-fade":
          "radial-gradient(circle at 50% 0%, rgba(198,255,61,0.18), transparent 60%)",
        "neon-glow":
          "radial-gradient(circle at 50% 50%, rgba(198,255,61,0.35), transparent 70%)",
      },
      backgroundSize: {
        grid: "48px 48px",
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(198,255,61,0.45)",
        "glow-soft": "0 0 80px -20px rgba(198,255,61,0.35)",
        card: "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 3s linear infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
