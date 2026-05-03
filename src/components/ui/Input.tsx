import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/src/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  hint?: string;
  error?: string;
}

export const Input = ({ label, placeholder, icon, hint, error, className, ...props }: InputProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[13px] font-medium color-text-secondary tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className={cn(
            "absolute left-3 flex transition-colors duration-150",
            focused ? "text-coral" : "text-text-muted"
          )}>
            {icon}
          </span>
        )}
        <input
          {...props}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            "w-full h-10 bg-surface rounded-[9px] font-sans text-sm color-text-primary outline-none transition-all duration-150",
            "border-[1.5px]",
            icon ? "pl-[38px] pr-3.5" : "px-3.5",
            error ? "border-[#EF4444]" : focused ? "border-coral shadow-[0_0_0_3px_rgba(217,119,87,0.15)]" : "border-border-subtle",
            className
          )}
        />
      </div>
      {(hint || error) && (
        <span className={cn("text-[12px]", error ? "text-[#EF4444]" : "text-text-muted")}>
          {error || hint}
        </span>
      )}
    </div>
  );
};
