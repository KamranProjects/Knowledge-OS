import React, { createContext, useContext, useState, useEffect } from "react";

export type SourceType = "pdf" | "youtube" | "image" | "text" | "video/youtube";

export interface Source {
  id: string;
  name: string;
  content: string;
  type: string;
  createdAt: number;
}

export interface LearningPlan {
  id: string;
  title: string;
  modules: any[];
}

interface StudyContextType {
  sources: Source[];
  setSources: React.Dispatch<React.SetStateAction<Source[]>>;
  activeSourceIds: string[];
  setActiveSourceIds: React.Dispatch<React.SetStateAction<string[]>>;
  addSource: (content: string, name: string, type: string) => Promise<void>;
  deleteSource: (id: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  learningPlans: LearningPlan[];
  setLearningPlans: React.Dispatch<React.SetStateAction<LearningPlan[]>>;
  activeChatDoc: Source | null;
  setActiveChatDoc: (doc: Source | null) => void;
  chatHistory: any[];
  setChatHistory: React.Dispatch<React.SetStateAction<any[]>>;
  draftPrompt: string;
  setDraftPrompt: (p: string) => void;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [activeSourceIds, setActiveSourceIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([]);
  const [activeChatDoc, setActiveChatDocState] = useState<Source | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [draftPrompt, setDraftPrompt] = useState("");

  // Load from localStorage on init
  useEffect(() => {
    const savedSources = localStorage.getItem("research_sources");
    if (savedSources) {
      try {
        const parsed = JSON.parse(savedSources);
        setSources(parsed);
        setActiveSourceIds(parsed.map((s: Source) => s.id));
      } catch (e) {
        console.error("Failed to parse sources", e);
      }
    }

    const savedPlans = localStorage.getItem("learning_plans");
    if (savedPlans) {
      try {
        setLearningPlans(JSON.parse(savedPlans));
      } catch (e) {}
    }

    const savedDoc = localStorage.getItem("active_chat_doc");
    if (savedDoc) {
      try {
        setActiveChatDocState(JSON.parse(savedDoc));
      } catch (e) {}
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("research_sources", JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    localStorage.setItem("learning_plans", JSON.stringify(learningPlans));
  }, [learningPlans]);

  useEffect(() => {
    localStorage.setItem("chat_history", JSON.stringify(chatHistory));
  }, [chatHistory]);

  const setActiveChatDoc = (doc: Source | null) => {
    setActiveChatDocState(doc);
    if (doc) {
      localStorage.setItem("active_chat_doc", JSON.stringify(doc));
    } else {
      localStorage.removeItem("active_chat_doc");
    }
  };

  const addSource = async (content: string, name: string, type: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newSource: Source = {
      id,
      name,
      content,
      type,
      createdAt: Date.now(),
    };

    // Ingest into RAG via API
    try {
      await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: id, text: content })
      });
    } catch (e) {
      console.error("RAG ingestion failed", e);
    }

    setSources((prev) => [newSource, ...prev]);
    setActiveSourceIds((prev) => [...prev, id]);
  };

  const deleteSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    setActiveSourceIds((prev) => prev.filter((sid) => sid !== id));
    if (activeChatDoc?.id === id) setActiveChatDoc(null);
  };

  return (
    <StudyContext.Provider value={{ 
      sources, setSources, 
      activeSourceIds, setActiveSourceIds, 
      addSource, deleteSource,
      activeTab, setActiveTab,
      learningPlans, setLearningPlans,
      activeChatDoc, setActiveChatDoc,
      chatHistory, setChatHistory,
      draftPrompt, setDraftPrompt
    }}>
      {children}
    </StudyContext.Provider>
  );
};

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (!context) throw new Error("useStudy must be used within a StudyProvider");
  return context;
};
