"use client";
import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Highlight } from "@/components/Highlight";
import { Paragraph } from "@/components/Paragraph";
import { WorkHistory } from "@/components/WorkHistory";
import { motion } from "framer-motion";
import { IconDownload } from "@tabler/icons-react";
import Link from "next/link";

export default function Home() {
  return (
    <Container>
      <span className="text-4xl">💼</span>
      <Heading className="font-black text-primary dark:text-white">
        Work History
      </Heading>
      <Paragraph className="max-w-xl mt-4 text-secondary dark:text-neutral-300">
        I’m a full-stack developer with a Computer Engineering degree from
        Amasya University. I enjoy{" "}
        <Highlight>building scalable applications</Highlight> and crafting
        intuitive digital experiences using modern technologies.
      </Paragraph>

      {/* 🔽 Resume download button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="mt-8"
      >
        <Link
          href="/pdf/Yunus%20Emre%20Koyun%20Resume%2007.2025.pdf"
          download
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary text-white dark:bg-white dark:text-black font-semibold hover:scale-105 hover:shadow-lg transition transform duration-200"
        >
          <IconDownload className="w-5 h-5" />
          Download Resume
        </Link>
      </motion.div>

      <WorkHistory />
    </Container>
  );
}
