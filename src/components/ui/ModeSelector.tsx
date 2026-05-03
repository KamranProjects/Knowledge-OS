import { cn } from "@/src/lib/utils";
import { Brain, Hammer, GraduationCap, Users, TestTube2, Layout } from "lucide-react";

export const MODES = [
  { id: "feynman", icon: Brain, label: "Feynman", color: "blue", description: "Simple analogies and beginner-friendly breakdown." },
  { id: "drill", icon: Hammer, label: "Drill", color: "accent", description: "Rapid questioning and strict answer checking." },
  { id: "teacher", icon: GraduationCap, label: "Teacher", color: "green", description: "Structured lessons and syllabus-based explanation." },
  { id: "buddy", icon: Users, label: "Buddy", color: "amber", description: "Casual, conversational learning style." },
  { id: "examiner", icon: TestTube2, label: "Examiner", color: "purple", description: "Strict evaluation with score and reasoning." },
  { id: "visual", icon: Layout, label: "Visual", color: "blue", description: "Diagrammatic flows and concept linking." },
] as const;

export type StudyModeId = typeof MODES[number]["id"];

interface ModeSelectorProps {
  active: StudyModeId;
  onChange: (id: StudyModeId) => void;
  className?: string;
}

export const ModeSelector = ({ active, onChange, className }: ModeSelectorProps) => {
  return (
    <div className={cn(
      "flex gap-1.5 flex-wrap p-1.5 bg-sidebar rounded-[12px] w-fit shadow-sm border border-border-subtle",
      className
    )}>
      {MODES.map((m) => {
        const isActive = active === m.id;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            onClick={() => onChange?.(m.id)}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] border-none font-sans text-[13px] transition-all duration-150 cursor-pointer",
              isActive 
                ? "bg-surface text-text-primary font-semibold shadow-sm" 
                : "bg-transparent text-text-secondary hover:bg-white/50"
            )}
            title={m.description}
          >
            <Icon size={14} className={isActive ? "text-coral" : "text-text-muted"} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
};
