"use client";

import { Container } from "@/components/Container";
import { Highlight } from "@/components/Highlight";
import { Products } from "@/components/Products";
import { TechStack } from "@/components/TechStack";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <Container>
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-4xl md:text-5xl font-black text-primary dark:text-white flex items-center gap-2"
      >
        <span>👋</span> Hi! I&apos;m Yunus Emre Koyun
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-secondary dark:text-neutral-300 mt-4 max-w-xl text-base md:text-lg"
      >
        I design and develop modern <Highlight>web applications</Highlight> with
        a focus on performance, clarity, and user experience. I&apos;m a fullstack
        developer who enjoys working across the entire stack—from backend
        architecture to frontend polish.
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="text-secondary dark:text-neutral-300 mt-4 max-w-xl text-base md:text-lg"
      >
        I also build <Highlight>casual games</Highlight> using Unity. My goal is
        to create simple, enjoyable gameplay experiences while keeping the
        codebase clean and manageable. I approach game development like I do
        software: organized, scalable, and thoughtful.
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.0 }}
        className="font-black text-lg md:text-lg lg:text-lg mt-20 mb-4 text-primary dark:text-white"
      >
        What am I working on?
      </motion.h2>

      <Products />
      <TechStack />
    </Container>
  );
}
