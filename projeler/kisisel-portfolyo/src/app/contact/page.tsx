import { Contact } from "@/components/Contact";
import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Highlight } from "@/components/Highlight";
import { Paragraph } from "@/components/Paragraph";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Yunus Emre Koyun",
  description:
    "Yunus Emre Koyun is a developer who loves building web applications, games, and scalable systems.",
};

export default function ContactPage() {
  return (
    <Container>
      <span className="text-4xl">✉️</span>
      <Heading className="font-black pb-4 text-primary dark:text-white">
        Contact Me
      </Heading>

      <Paragraph className="mb-10 max-w-xl text-neutral-700 dark:text-neutral-200">
        Reach out to me over email or fill up this contact form. I will get back
        to you <Highlight>ASAP</Highlight> – I promise.
      </Paragraph>

      <Contact />
    </Container>
  );
}
