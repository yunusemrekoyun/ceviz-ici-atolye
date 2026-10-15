/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // 👇 animasyonlar
      animation: {
        "scroll-x": "scrollX 25s linear infinite", // sende vardı
        marquee: "marquee 28s linear infinite", // eklendi
      },
      keyframes: {
        scrollX: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },

      colors: {
        brandDark: "#0b0b0d",
        brandBlue: "#125795",
        primaryColor: "#FFFFFF",
        secondaryColor: "#226473",
        tertiaryColor: "#807c7cd4",
        quaternaryColor: "#195973",
        transparanColor: "#ffffff00",

        koyumavi: "#01587a",
        açıkmavi: "#5cb3c1",
        buzbeyaz: "#98d8dd",
        buzbeyazseffaf: "#FFFFFF",
        gri: "#e1e8eb",
      },
      fontFamily: {
        merriweather: ["Merriweather", "serif"],
        montserrat: ["Montserrat", "sans-serif"],
      },
      container: {
        center: true,
        padding: {
          DEFAULT: "1rem",
          sm: "2rem",
          lg: "4rem",
          xl: "5rem",
          "2xl": "6rem",
        },
      },
    },
  },
  plugins: [],
};
