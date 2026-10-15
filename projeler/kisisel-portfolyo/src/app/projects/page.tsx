import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Products } from "@/components/Products";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Yunus Emre Koyun - Full Stack Developer",
  description:
    "Yunus Emre Koyun is a full stack developer who loves building web applications, games, and scalable systems.",
};

export default function Projects() {
  return (
    <Container>
      <span className="text-4xl">⚡</span>
      <Heading className="font-black mb-10 text-primary dark:text-white">
        What I&apos;ve been working on
      </Heading>

      <Products />
    </Container>
  );
}
