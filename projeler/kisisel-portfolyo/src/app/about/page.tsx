import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Highlight } from "@/components/Highlight";
import { Paragraph } from "@/components/Paragraph";
import { Products } from "@/components/Products";
import { Metadata } from "next";
import Image from "next/image";

import { motion } from "framer-motion";
import About from "@/components/About";

export const metadata: Metadata = {
  title: "About | Yunus Emre Koyun",
  description:
    "Yunus Emre Koyun is a developer who loves building web applications, games, and scalable systems.",
};

export default function AboutPage() {
  const images = [
    "/images/about-1.jpeg",
    "/images/about-2.jpeg",
    "/images/about-3.jpeg",
  ];
  return (
    <Container>
      <span className="text-4xl">💬</span>
      <Heading className="font-black text-primary dark:text-white">
        About Me
      </Heading>
      <About />
    </Container>
  );
}
