import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Georama, Roboto_Mono } from "next/font/google";

import "./globals.css";

export const metadata = {
  title: "Yunus Emre Koyun",
  description:
    "Computer Engineering graduate and full-stack web developer focused on the JavaScript ecosystem. Experienced in building end-to-end web applications using React, Next.js, Vue, and Node.js, primarily within the MERN stack. Comfortable working across frontend and backend layers, designing RESTful APIs, and integrating databases such as PostgreSQL and MSSQL. Continuously learning and adapting to new JavaScript frameworks and modern web development practices.",
  icons: { icon: "/macbook.png" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const georama = Georama({
  subsets: ["latin"],
  variable: "--font-georama-next",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-next",
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${georama.variable} ${robotoMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
