import { ReactNode } from "react";
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  BrainCircuit, 
  Calendar, 
  Settings,
  Plus,
  PenTool,
  Edit3,
  Search
 } from "lucide-react";
import { cn } from "../lib/utils";

import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const { user } = useAuth();
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "library", label: "Library", icon: <BookOpen size={18} /> },
    { id: "study", label: "Study Mode", icon: <BrainCircuit size={18} /> },
    { id: "exams", label: "Exams", icon: <GraduationCap size={18} /> },
    { id: "planner", label: "Curriculum Planner", icon: <Calendar size={18} /> },
    { id: "courses", label: "Courses", icon: <GraduationCap size={18} /> },
    { id: "notebook", label: "Synthesis Lab", icon: <Edit3 size={18} /> },
    { id: "research", label: "Research Engine", icon: <Search size={18} /> },
    { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  return (
    <div className="w-[240px] h-full bg-sidebar border-r border-border-subtle flex flex-col p-4">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-8 h-8 bg-coral rounded-[8px] flex items-center justify-center text-white font-bold">
          K
        </div>
        <span className="font-serif text-xl color-text-primary">Knowledge OS</span>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-[9px] transition-all duration-120 text-sm font-medium",
              activeTab === item.id 
                ? "bg-[#F5E6DF] text-[#C4613E]" 
                : "text-text-secondary hover:bg-white/50 hover:text-text-primary"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-sm font-medium text-text-secondary hover:bg-white/50">
          <Settings size={18} />
          Settings
        </button>
        <div className="mt-4 p-3 bg-surface/50 border border-border-subtle rounded-[12px] flex items-center gap-3">
          <div className="w-8 h-8 bg-border-strong rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold text-text-muted">
            USER
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-text-primary truncate max-w-[120px]">
              {user?.displayName || user?.email?.split('@')[0] || "Explorer"}
            </span>
            <span className="text-[10px] text-text-muted">Research Account</span>
          </div>
        </div>
      </div>
    </div>
  );
};
