import { Sidebar } from "@/components/Sidebar";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { twMerge } from "tailwind-merge";
import { Footer } from "@/components/Footer";
import Head from "next/head";
const inter = Inter({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Yunus Emre Koyun - Full Stack Developer",
  description:
    "Yunus Emre Koyun is a full stack developer who loves building web applications, games, and scalable systems.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      {" "}
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body
        className={twMerge(
          inter.className,
          "flex antialiased min-h-screen bg-gray-100 dark:bg-neutral-900 text-black dark:text-white transition-colors duration-300"
        )}
      >
        <Sidebar />
        <div className="lg:pl-2 lg:pt-2 bg-gray-100 dark:bg-neutral-900 flex-1 overflow-y-auto">
          <div className="flex-1 bg-white dark:bg-neutral-800 min-h-screen lg:rounded-tl-xl border border-transparent lg:border-neutral-200 dark:lg:border-neutral-700 overflow-y-auto">
            {children}
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
