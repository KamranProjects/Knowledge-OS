import { type ReactNode, type ElementType } from "react";
import { cn } from "@/src/lib/utils";

interface HeadingProps {
  level?: 1 | 2 | 3 | 4;
  children: ReactNode;
  serif?: boolean;
  className?: string;
}

export const Heading = ({ level = 1, children, serif = true, className }: HeadingProps) => {
  const Tag = `h${level}` as ElementType;
  const sizes = {
    1: "text-[32px]",
    2: "text-[24px]",
    3: "text-[19px]",
    4: "text-[16px]",
  };

  return (
    <Tag className={cn(
      serif ? "font-serif" : "font-sans",
      sizes[level],
      serif ? "font-normal" : "font-semibold",
      "text-text-primary tracking-tight leading-[1.25]",
      className
    )}>
      {children}
    </Tag>
  );
};

export const Divider = ({ className }: { className?: string }) => (
  <hr className={cn("border-none border-t-[1.5px] border-border-subtle", className)} />
);
