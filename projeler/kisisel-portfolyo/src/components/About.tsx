"use client";
import { Paragraph } from "@/components/Paragraph";
import Image from "next/image";
import { motion } from "framer-motion";

export default function About() {
  const images = [
    "/images/about-1.jpeg",
    "/images/about-2.jpeg",
    "/images/about-3.jpeg",
  ];

  return (
    <div className="text-secondary dark:text-neutral-100">
      {/* Görsel Galerisi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 my-10">
        {images.map((image, index) => (
          <motion.div
            key={image}
            initial={{ opacity: 0, y: -50, rotate: 0 }}
            animate={{
              opacity: 1,
              y: 0,
              rotate: index % 2 === 0 ? 3 : -3,
            }}
            transition={{ duration: 0.2, delay: index * 0.1 }}
          >
            <div
              className="overflow-hidden rounded-md shadow-xl 
              transition-transform duration-200 bg-white dark:bg-neutral-100"
            >
              <Image
                src={image}
                width={200}
                height={400}
                alt={`about-image-${index + 1}`}
                className="object-cover block w-full h-40 md:h-60 
                transform transition-transform duration-200 hover:rotate-0"
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Metin Alanı */}
      <div className="max-w-4xl">
        <Paragraph className="mt-4">
          I&apos;m Yunus Emre Koyun — a Fullstack Developer with a background in
          Computer Engineering.
        </Paragraph>

        <Paragraph className="mt-2 text-sm italic text-neutral-500 dark:text-neutral-400">
          🎓 B.Sc. in Computer Engineering, Amasya University (2021 – 2025)
        </Paragraph>
        
        <Paragraph className="mt-4">
          I develop complete web applications from scratch, mainly using the
          MERN stack. My work spans from building RESTful APIs and backend logic
          to crafting responsive and intuitive user interfaces with React.
        </Paragraph>
        <Paragraph className="mt-4">
          On the frontend, I structure every part of the UI as independent,
          reusable components. This approach allows me to quickly transfer,
          scale, or customize features across projects without rewriting the
          logic — making development faster, cleaner, and more maintainable.
        </Paragraph>
        <Paragraph className="mt-4">
          I also design and develop mobile games using Unity. I focus on
          building lightweight, engaging mechanics with scalable systems and
          level structures tailored for casual gaming experiences on mobile
          platforms.
        </Paragraph>
        <Paragraph className="mt-4">
          I care deeply about clean architecture, performance optimization, and
          writing code that&apos;s both scalable and developer-friendly.
          I&apos;m currently seeking to bring this mindset into a professional
          environment where I can contribute to real-world products, collaborate
          with a solid team, and push my skill set even further.
        </Paragraph>
      </div>
    </div>
  );
}
