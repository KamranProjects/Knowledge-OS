import { useState, ReactNode } from "react";
import { Search, Bell, HelpCircle } from "lucide-react";
import { Input } from "./ui/Input";

export const TopBar = ({ title }: { title: string }) => {
  return (
    <header className="h-[64px] border-b border-border-subtle px-6 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
      <h2 className="font-serif text-xl text-text-primary">{title}</h2>
      
      <div className="flex items-center gap-4 flex-1 max-w-[400px] mx-8">
        <Input 
          placeholder="Search topics, notes..." 
          icon={<Search size={16} />}
          className="h-9 bg-sidebar border-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 text-text-muted hover:text-text-primary transition-colors">
          <HelpCircle size={20} />
        </button>
        <button className="p-2 text-text-muted hover:text-text-primary transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-coral rounded-full border-2 border-white"></span>
        </button>
      </div>
    </header>
  );
};
