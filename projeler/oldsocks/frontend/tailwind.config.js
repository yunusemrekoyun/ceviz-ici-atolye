// tailwind.config.js
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  // Mağaza CSS'i: yönetim paneli (src/admin) ve Material Tailwind sınıfları hariç.
  // Panel sınıfları tailwind.admin.config.js ile src/admin/admin.css'e derlenir ve
  // yalnız panel açılınca yüklenir.
  content: [
    "./index.html",
    "./src/*.{js,jsx,ts,tsx}",
    "./src/{components,pages,context,hooks,services,utils}/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    // "xs" en küçük kırılım olarak başa eklenir; extend ile eklenirse CSS sırası bozulur.
    screens: { xs: "480px", ...defaultTheme.screens },
    extend: {
      fontFamily: {
        playfair: ['"Playfair Display"', "serif"],
      },
      colors: {
        black: "#000000",
        dark1: "#141414",
        dark2: "#1B1B1B",
        white: "#FFFFFF",
        light1: "#F3F3F3",
        light2: "#E1E1E1",
      },
      keyframes: {
        shake: {
          "0%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-10deg)" },
          "50%": { transform: "rotate(10deg)" },
          "75%": { transform: "rotate(-10deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
      },
      animation: {
        shake: "shake 0.4s ease-in-out",
      },
    },
  },

  
  plugins: [],
};

