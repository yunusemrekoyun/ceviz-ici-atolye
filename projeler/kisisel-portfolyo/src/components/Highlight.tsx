import React from "react";
import { twMerge } from "tailwind-merge";

export const Highlight = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <span
      className={twMerge(
        "bg-neutral-100 dark:bg-neutral-800 text-primary dark:text-neutral-100 px-1 py-0.5 rounded-sm",
        className
      )}
    >
      {children}
    </span>
  );
};
