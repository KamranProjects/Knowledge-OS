import { type ReactNode } from "react";
import { cn } from "@/src/lib/utils";

interface BadgeProps {
  label: string;
  color?: "accent" | "blue" | "green" | "amber" | "purple" | "neutral";
  icon?: ReactNode;
  className?: string;
}

export const Badge = ({ label, color = "accent", icon, className }: BadgeProps) => {
  const colorMap = {
    accent: "bg-[#F5E6DF] text-[#C4613E]",
    blue: "bg-[#EEF4FF] text-[#3558C4]",
    green: "bg-[#F0FBF0] text-[#2E7D32]",
    amber: "bg-[#FFF8EC] text-[#A05C00]",
    purple: "bg-[#FDF0F8] text-[#8E2479]",
    neutral: "bg-sidebar text-text-secondary",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium tracking-wide select-none",
      colorMap[color],
      className
    )}>
      {icon && <span className="flex">{icon}</span>}
      {label}
    </span>
  );
};
