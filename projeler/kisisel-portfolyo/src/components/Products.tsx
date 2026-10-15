"use client";
import React from "react";
import { Heading } from "./Heading";
import { Product } from "@/types/products";
import { products } from "@/constants/products";
import Link from "next/link";
import Image from "next/image";
import { Paragraph } from "./Paragraph";
import { motion } from "framer-motion";

export const Products = () => {
  return (
    <div>
      <div className="grid grid-cols-1 gap-10">
        {products.map((product: Product, idx: number) => (
          <motion.div
            key={product.href}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.1 }}
          >
            <Link
              href={product.slug ? `/projects/${product.slug}` : product.href}
              className="group flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 
                rounded-2xl transition duration-200 pt-4 
                hover:bg-gray-100 dark:hover:bg-neutral-700/60"
            >
              <div className="relative w-[300px] h-[180px] flex-shrink-0 rounded-md bg-white dark:bg-neutral-800">
                <Image
                  src={product.thumbnail}
                  alt="thumbnail"
                  fill
                  className="object-contain rounded-md"
                />
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <Heading
                    as="h4"
                    className="font-black text-lg md:text-lg lg:text-lg text-primary dark:text-white"
                  >
                    {product.title}
                  </Heading>
                  <Paragraph className="text-sm md:text-sm lg:text-sm mt-2 max-w-xl text-secondary dark:text-neutral-300">
                    {product.description}
                  </Paragraph>
                </div>
                <div className="flex flex-wrap gap-2 md:mb-1 mt-2 md:mt-0">
                  {product.stack?.map((stack: string) => (
                    <span
                      key={stack}
                      className="text-xs bg-gray-100 dark:bg-neutral-700 px-2 py-1 rounded-sm 
                        text-secondary dark:text-neutral-200"
                    >
                      {stack}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
