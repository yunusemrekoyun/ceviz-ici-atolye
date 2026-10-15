import React from "react";
import { twMerge } from "tailwind-merge";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const Paragraph = ({ children, className }: Props) => {
  return (
    <p
      className={twMerge(
        "text-secondary dark:text-neutral-100 text-base md:text-lg",
        className
      )}
    >
      {children}
    </p>
  );
};
