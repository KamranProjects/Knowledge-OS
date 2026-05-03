import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/src/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  children: ReactNode;
}

export const Button = ({
  variant = "primary",
  size = "md",
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) => {
  const [pressed, setPressed] = useState(false);

  const baseStyles = "inline-flex items-center justify-center gap-2 font-sans font-medium tracking-tight border-none cursor-pointer transition-all duration-150 rounded-[9px] select-none whitespace-nowrap active:translate-y-[1px]";
  
  const sizes = {
    sm: "px-3.5 text-[13px] h-8",
    md: "px-[18px] text-[14px] h-10",
    lg: "px-6 text-[15px] h-12",
  };

  const variants = {
    primary: "bg-coral text-[#FAF7F4] shadow-[0_1px_2px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-coral-hover hover:shadow-[0_2px_6px_rgba(217,119,87,0.3)]",
    secondary: "bg-transparent text-text-primary border-[1.5px] border-border-strong shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-sidebar hover:border-text-muted",
    ghost: "bg-transparent text-text-secondary hover:bg-sidebar hover:text-text-primary",
    danger: "bg-[#FEF2F2] text-[#B91C1C] border-[1.5px] border-[#FECACA] hover:bg-[#FEE2E2]",
  };

  return (
    <button
      {...props}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      disabled={disabled}
      className={cn(
        baseStyles,
        sizes[size],
        variants[variant],
        disabled && "opacity-45 pointer-events-none",
        pressed && !disabled && (variant === "primary" ? "bg-[#B05530]" : "bg-[#E0DAD4]"),
        className
      )}
    >
      {icon && <span className={cn("flex items-center", size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4")}>{icon}</span>}
      {children}
    </button>
  );
};
