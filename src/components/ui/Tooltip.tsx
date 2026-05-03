import React, { useState } from "react";
import { cn } from "../../lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
}

export const Tooltip = ({ children, content, className }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative flex items-center group cursor-help"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={cn(
          "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-text-primary text-white text-xs rounded-xl shadow-xl z-50 min-w-[200px] text-center animate-in fade-in zoom-in-95 duration-200",
          className
        )}>
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-text-primary" />
        </div>
      )}
    </div>
  );
};

export const HelpIconTooltip = ({ content, className }: { content: string; className?: string }) => (
  <Tooltip content={content} className={className}>
    <div className="w-5 h-5 rounded-full bg-sidebar flex items-center justify-center text-text-muted hover:text-text-primary transition-colors text-[10px] font-bold">
      ?
    </div>
  </Tooltip>
);
