import React from "react";
import { Heading } from "./Heading";
import { FaReact, FaNodeJs, FaHtml5, FaCss3Alt, FaUnity } from "react-icons/fa";
import {
  SiNextdotjs,
  SiMongodb,
  SiExpress,
  SiJavascript,
  SiDotnet,
  SiPostgresql,
} from "react-icons/si";

export const TechStack = () => {
  const stack = [
    { title: "React", icon: <FaReact size={32} /> },
    { title: "Next.js", icon: <SiNextdotjs size={32} /> },
    { title: "Node.js", icon: <FaNodeJs size={32} /> },
    { title: "Express.js", icon: <SiExpress size={32} /> },
    { title: "JavaScript", icon: <SiJavascript size={32} /> },
    { title: "MongoDB", icon: <SiMongodb size={32} /> },
    { title: "PostgreSQL", icon: <SiPostgresql size={32} /> },
    { title: ".NET", icon: <SiDotnet size={32} /> },
    { title: "Unity", icon: <FaUnity size={32} /> },
    { title: "HTML", icon: <FaHtml5 size={32} /> },
    { title: "CSS", icon: <FaCss3Alt size={32} /> },
  ];

  return (
    <div>
      <Heading
        as="h2"
        className="font-black text-lg md:text-lg lg:text-lg mt-20 mb-4 text-neutral-800 dark:text-neutral-100"
      >
        Tech Stack
      </Heading>
      <div className="flex flex-wrap">
        {stack.map((item) => (
          <div
            key={item.title}
            className="p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg shadow-sm dark:shadow-md mr-4 mb-4 flex flex-col items-center justify-center transition duration-200 text-neutral-800 dark:text-neutral-100"
          >
            {item.icon}
            <span className="mt-2 text-xs font-medium">{item.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
