import { cn } from "@/src/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: "accent" | "green" | "blue";
  className?: string;
}

export const ProgressBar = ({ value = 0, max = 100, label, color = "accent", className }: ProgressBarProps) => {
  const colorMap = {
    accent: "bg-coral",
    green: "bg-[#4CAF50]",
    blue: "bg-[#3558C4]",
  };
  
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      {label && (
        <div className="flex justify-between text-[13px] text-text-secondary">
          <span>{label}</span>
          <span className="font-medium">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-border-subtle rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", colorMap[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
