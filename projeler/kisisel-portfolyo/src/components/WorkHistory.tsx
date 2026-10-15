"use client";
import { timeline } from "@/constants/timeline";
import React from "react";
import { Paragraph } from "./Paragraph";
import { Heading } from "./Heading";
import { IconCircleCheckFilled } from "@tabler/icons-react";

export const WorkHistory = () => {
  return (
    <div className="mt-10">
      {timeline.map((item, index) => (
        <div
          className="flex md:flex-row flex-col space-y-10 md:space-y-0 space-x-10 my-20 relative"
          key={`timeline-${index}`}
        >
          <Paragraph className="w-40 text-secondary dark:text-neutral-400">
            {item.date}
          </Paragraph>
          <div>
            <Heading
              as="h5"
              className="text-lg md:text-lg lg:text-lg text-emerald-500"
            >
              {item.company}
            </Heading>
            <Paragraph className="text-base font-semibold text-primary dark:text-white">
              {item.title}
            </Paragraph>
            <Paragraph className="text-sm mb-4 text-secondary dark:text-neutral-300">
              {item.description}
            </Paragraph>

            {item.responsibilities.map((responsibility, index) => (
              <Step key={responsibility}>{responsibility}</Step>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const Step = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex space-x-1 items-start my-2">
      <IconCircleCheckFilled className="h-3 w-4 mt-1 text-neutral-400 dark:text-neutral-600" />
      <Paragraph className="text-sm text-secondary dark:text-neutral-300">
        {children}
      </Paragraph>
    </div>
  );
};
