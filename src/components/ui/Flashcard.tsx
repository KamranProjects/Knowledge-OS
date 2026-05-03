import { useState } from "react";
import { cn } from "@/src/lib/utils";

interface FlashcardProps {
  front: string;
  back: string;
  className?: string;
}

export const Flashcard = ({ front, back, className }: FlashcardProps) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      onClick={() => setFlipped(!flipped)}
      className={cn("w-[320px] h-[200px] [perspective:1000px] cursor-pointer select-none", className)}
    >
      <div className={cn(
        "relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]",
        flipped && "[transform:rotateY(180deg)]"
      )}>
        {/* Front */}
        <div className="absolute inset-0 bg-surface border-[1.5px] border-border-subtle rounded-[16px] [backface-visibility:hidden] flex flex-col items-center justify-center p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <span className="text-[11px] font-semibold text-text-muted tracking-[0.08em] uppercase mb-3">Question</span>
          <p className="text-[15px] text-center text-text-primary leading-relaxed">{front}</p>
          <span className="mt-4 text-[12px] text-border-strong">Tap to reveal →</span>
        </div>
        {/* Back */}
        <div className="absolute inset-0 bg-coral rounded-[16px] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center p-5 shadow-[0_2px_12px_rgba(217,119,87,0.25)]">
          <span className="text-[11px] font-semibold text-white/70 tracking-[0.08em] uppercase mb-3">Answer</span>
          <p className="text-[15px] text-center text-white font-medium leading-relaxed">{back}</p>
        </div>
      </div>
    </div>
  );
};
