// Yönetim paneli CSS'i (src/admin/admin.css). Tüm kaynakları tarar; mağaza CSS'inden
// sonra yüklendiği için aynı sınıflarda sıralama bu dosyaya göre olur.
import storefront from "./tailwind.config.js";

export default {
  ...storefront,
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@material-tailwind/react/components/**/*.js",
    "./node_modules/@material-tailwind/react/theme/components/**/*.js",
  ],
};
