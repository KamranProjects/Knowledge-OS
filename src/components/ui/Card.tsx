import { useState, type ReactNode } from "react";
import { cn } from "@/src/lib/utils";

interface CardProps {
  children: ReactNode;
  hover?: boolean;
  padding?: string;
  className?: string;
  onClick?: () => void;
}

export const Card = ({ children, hover = false, padding = "20px", className, onClick }: CardProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ padding }}
      className={cn(
        "bg-surface border-[1.5px] border-border-subtle rounded-[14px] transition-all duration-180",
        "shadow-[0_1px_4px_rgba(0,0,0,0.04)]",
        hover && "cursor-pointer hover:border-border-strong hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:-translate-y-px",
        className
      )}
    >
      {children}
    </div>
  );
};
