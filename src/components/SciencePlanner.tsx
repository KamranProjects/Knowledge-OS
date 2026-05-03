import { useState, useEffect, useRef } from "react";
import { Heading } from "./ui/Typography";
import { Card } from "./ui/Card";
import { 
  Compass, 
  Book, 
  Target, 
  Sparkles, 
  ChevronRight, 
  GraduationCap,
  History,
  Clock,
  Plus,
  Save,
  Search,
  BookOpen,
  ArrowRight,
  Loader2,
  XCircle,
  FileText,
  Trash2
} from "lucide-react";
import { Badge } from "./ui/Badge";
import ReactMarkdown from "react-markdown";
import { ChatBubble, ChatInput, OptionSelector, TypingIndicator, ChatOption } from "./ui/Chat";
import { callGemini } from "../lib/gemini";
import { Tooltip, HelpIconTooltip } from "./ui/Tooltip";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";
import { useStudy } from "../context/StudyContext";

interface ResearchPaper {
  title: string;
  link?: string;
  summary: string;
}

interface CourseModule {
  id: string;
  title: string;
  description: string;
  topics: string[];
  status: "locked" | "active" | "completed";
}

interface LearningPlan {
  id: string;
  title: string;
  modules: CourseModule[];
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user" | "model" | "system";
  content: string;
  type?: "text" | "options" | "quiz" | "research";
  data?: any;
  options?: ChatOption[];
  optStyle?: "card" | "pill";
  optLabel?: string;
  answered?: boolean;
}

interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export const KnowledgePlanner = () => {
  const { learningPlans, setLearningPlans } = useStudy();
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem("planner_sessions");
    try {
      return saved ? JSON.parse(saved) : [{
        id: "default",
        title: "New Research Inquiry",
        messages: [{
          id: "1",
          role: "assistant",
          content: "I am the Knowledge Architect. Tell me: What domain should we research today? Specify your level (Beginner/Expert) and goal (Academic/Self-Study).",
        }],
        updatedAt: Date.now()
      }];
    } catch {
      return [{
        id: "default",
        title: "New Research Inquiry",
        messages: [{
          id: "1",
          role: "assistant",
          content: "I am the Knowledge Architect. Tell me: What domain should we research today? Specify your level (Beginner/Expert) and goal (Academic/Self-Study).",
        }],
        updatedAt: Date.now()
      }];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState<string>("default");
  const [isLoading, setIsLoading] = useState(false);
  const [imageAttachment, setImageAttachment] = useState<{ data: string, mimeType: string, extractedText?: string } | null>(null);
  const [foundPapers, setFoundPapers] = useState<ResearchPaper[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const preferredModel = localStorage.getItem("preferred_llm") || "gemini-1.5-flash-latest";

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    localStorage.setItem("planner_sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession.messages, isLoading]);

  const saveFoundPlan = (planJson: string) => {
    try {
      const jsonMatch = planJson.match(/\{.*\}/s);
      if (!jsonMatch) return;
      const plan = JSON.parse(jsonMatch[0]);
      
      setLearningPlans(prev => {
        if (!prev.find((p: any) => p.id === plan.id)) {
          return [...prev, plan];
        }
        return prev;
      });
    } catch (e) {
      console.error("Failed to save plan", e);
    }
  };

  const addMessage = (msg: Omit<ChatMessage, "id">) => {
    const newMsg = { ...msg, id: Math.random().toString(36).substr(2, 9) };
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: [...s.messages, newMsg],
      updatedAt: Date.now(),
      title: s.messages.length < 3 && msg.role === "user" ? msg.content.substring(0, 30) : s.title
    } : s));
  };

  const createNewSession = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const newSession: Session = {
      id,
      title: "New Inquiry",
      messages: [{
        id: "1",
        role: "assistant",
        content: "Architect ready. What is our next area of research?",
      }],
      updatedAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(id);
  };

  const deleteSession = (id: string) => {
    if (sessions.length === 1) {
       // Reset first session instead of deleting
       setSessions([{
          id: "default",
          title: "New Research Inquiry",
          messages: [{
            id: "1",
            role: "assistant",
            content: "Architect ready. What is our next area of research?",
          }],
          updatedAt: Date.now()
       }]);
       setActiveSessionId("default");
       return;
    }
    const newList = sessions.filter(s => s.id !== id);
    setSessions(newList);
    if (activeSessionId === id) setActiveSessionId(newList[0].id);
  };

  const performResearch = async (query: string): Promise<ResearchPaper[]> => {
    try {
      const response = await fetch("/api/research/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, source: "searx" })
      });
      const data = await response.json();
      const papers = Array.isArray(data) ? data : (data.papers || []);
      
      return papers.map((p: any) => ({
         title: p.title || "Untitled Intelligence",
         summary: p.summary || p.snippet || "No synopsis available.",
         link: p.link || "#"
      }));
    } catch (e) {
      console.error("Research failed:", e);
      return [];
    }
  };

  const runArchitectAI = async (userInput: string) => {
    setIsLoading(true);
    try {
      let context = "";
      try {
        const ctxRes = await fetch("/api/context", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userInput })
        });
        if (ctxRes.ok) {
            const data = await ctxRes.json();
            context = data.context;
        }
      } catch (e) {}

      // Append extracted text if available
      let finalPrompt = userInput;
      if (imageAttachment?.extractedText) {
        finalPrompt = `[EXTRACTED CONTENT FROM ATTACHMENT]:\n${imageAttachment.extractedText}\n\n[USER REQUEST]:\n${userInput}`;
      }

      const decisionPrompt = `User input: "${userInput}". 
      Does this request require searching for academic papers or external scientific data? 
      Return ONLY "YES" or "NO".`;
      
      const decideRes = await callGemini({
        model: preferredModel,
        contents: [{ role: "user", parts: [{ text: decisionPrompt }] }]
      });

      let researchData: ResearchPaper[] = [];
      if (decideRes.text?.includes("YES")) {
        addMessage({ role: "assistant", content: `Architect is accessing scientific databases for "${userInput}"...`, type: "text" });
        researchData = await performResearch(userInput);
        setFoundPapers(prev => {
            const combined = [...researchData, ...prev];
            // Unique by title
            return combined.filter((v,i,a)=>a.findIndex(t=>(t.title === v.title))===i).slice(0, 5);
        });
      }

      const response = await callGemini({
        model: preferredModel,
        contents: [
          ...activeSession.messages.map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }]
          })),
          { role: "user", parts: [{ text: finalPrompt }] }
        ],
        attachments: imageAttachment ? [{ data: imageAttachment.data, mimeType: imageAttachment.mimeType }] : [],
        systemInstruction: `You are the Knowledge Architect, a high-level scientific researcher and academic strategist.
        
        CRITICAL: If the user provides a learning goal, you MUST create a SYNAPTIC PLAN.
        
        STUDY ECOSYSTEM CONTEXT:
        ${context || "No specific document context available."}

        EXISTING LEARNING PLANS:
        ${JSON.stringify(learningPlans)}

        LATEST RESEARCH DATA:
        ${JSON.stringify(researchData)}

        OBJECTIVE:
        1. On initiation: Determine Academic Level and Strategic Goal.
        2. Framework Generation: Create a multi-phase "SYNAPTIC PLAN".
        3. MODULE TEACHING: If a user asks to learn a module, provide a deep, first-principles explanation.
        4. FINALIZING A PLAN: If you decide to finalize a study plan, move directly to creating the course structure. You MUST append a JSON block at the very end of your message in EXACTLY this format (NO markdown blocks around the JSON, return it as part of the text): 
           JSON_PLAN: {"id": "unique-id", "title": "Field Name", "modules": [{"id": "m1", "title": "Module 1", "description": "...", "topics": ["T1", "T2"], "status": "active"}]}
        5. Factual Integrity: Leverage LATEST RESEARCH DATA. Cite ArXiv, NASA, or OpenAlex sources explicitly using [Source Title] notation.
        6. Tone: Sophisticated, precise, and analytical. DO NOT USE EMOJIS.
        
        FORMATTING:
        - Use bold for technical terminology.
        - Use code blocks for mathematical formulas or data structures.
        - Maintain a clean, academic layout.`
      });

      const textContent = response.text || "";
      setImageAttachment(null); // Clear attachment after use

      // Extraction of JSON plan if present
      const jsonPlanMarker = "JSON_PLAN:";
      if (textContent.includes(jsonPlanMarker)) {
        const parts = textContent.split(jsonPlanMarker);
        const cleanedPart = parts[0].trim();
        const planStr = parts.slice(1).join(jsonPlanMarker).trim();
        
        // Find the actual JSON within the planStr (handles markdown artifacts)
        const jsonMatch = planStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          saveFoundPlan(jsonMatch[0]);
          addMessage({ role: "assistant", content: cleanedPart, type: "text" });
          addMessage({ role: "assistant", content: "Course hierarchy synchronized to Learning Navigator.", type: "text" });
        } else {
          addMessage({ role: "assistant", content: textContent, type: "text" });
        }
      } else {
        // Fallback for cases where JSON block is present but omitted keyword
        const directJsonMatch = textContent.match(/JSON_PLAN:\s*(\{[\s\S]*\})/) || textContent.match(/(\{[\s\S]*"modules"[\s\S]*\})/);
        if (directJsonMatch) {
          saveFoundPlan(directJsonMatch[1] || directJsonMatch[0]);
          const cleaned = textContent.replace(directJsonMatch[0], "").trim();
          addMessage({ role: "assistant", content: cleaned || "Synaptic Plan Generated.", type: "text" });
          addMessage({ role: "assistant", content: "Course hierarchy synchronized to Learning Navigator.", type: "text" });
        } else {
          addMessage({ role: "assistant", content: textContent, type: "text" });
        }
      }
    } catch (error: any) {
      console.error(error);
      const errorMsg = error?.message || "Unknown error";
      addMessage({ role: "assistant", content: `Architect encountered a cognitive stall (${errorMsg}). This often happens if the AI model results were blocked by safety filters or a quota limit. Verify your API settings if this persists.` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (text: string) => {
    addMessage({ role: "user", content: text });
    runArchitectAI(text);
  };

  return (
    <div className="flex h-full w-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 bg-canvas">
      {/* Sessions Rail */}
      <div className="hidden md:flex w-72 border-r border-border-subtle flex-col gap-6 p-6 bg-sidebar/20 backdrop-blur-md">
        <div className="flex items-center justify-between">
           <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Inquiry Matrix</span>
           <HelpIconTooltip content="Switch between specialized research tracks." />
        </div>
        
        <Button 
          variant="secondary" 
          className="rounded-2xl p-4 h-12 justify-start gap-3 border-dashed bg-white/50"
          onClick={createNewSession}
          icon={<Plus size={18} />}
        >
          New Track
        </Button>

        <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar flex-1">
          {sessions.map(s => (
            <div 
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={cn(
                "group p-4 rounded-2xl cursor-pointer transition-all border flex justify-between items-center",
                s.id === activeSessionId 
                  ? "bg-white border-coral shadow-sm shadow-coral/5" 
                  : "border-transparent hover:bg-white/50"
              )}
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className={cn("text-sm font-medium truncate", s.id === activeSessionId ? "text-text-primary" : "text-text-secondary")}>
                  {s.title}
                </span>
                <span className="text-[10px] text-text-muted">{new Date(s.updatedAt).toLocaleDateString()}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 border-b border-border-subtle px-8 flex items-center justify-between bg-white/50 backdrop-blur-sm z-10">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Compass size={20} />
              </div>
              <h2 className="font-serif text-xl truncate max-w-[300px]">{activeSession.title}</h2>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-full border border-green-100">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Researcher Online
              </div>
              <HelpIconTooltip content="The Architect researches scientific databases (ArXiv, NASA, etc.) in real-time." />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-12 md:px-12 no-scrollbar">
          <div className="max-w-3xl mx-auto flex flex-col gap-12">
            {activeSession.messages.map((m) => (
              <div key={m.id} className="flex flex-col gap-6">
                <ChatBubble role={m.role as any}>
                  <div className="markdown-body text-lg leading-relaxed font-sans">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </ChatBubble>
              </div>
            ))}
            {isLoading && (
              <div className="ml-14">
                <TypingIndicator />
              </div>
            )}
            <div ref={scrollRef} className="h-4" />
          </div>
        </div>

        <div className="p-10 max-w-4xl mx-auto w-full">
          <ChatInput 
            onSend={handleSend}
            isLoading={isLoading}
            imageAttachment={imageAttachment}
            setImageAttachment={setImageAttachment}
            initialValue=""
            placeholder="Ask your Architect to research or plan a topic..."
            quickActions={[
              { icon: "🔍", label: "Research", text: "Research the current state of..." },
              { icon: "📋", label: "Plan", text: "Create a detailed study plan for..." },
              { icon: "🧬", label: "Foundations", text: "Explain the first principles of..." }
            ]}
          />
        </div>
      </div>

      {/* Right Rail - Status */}
      <div className="hidden lg:flex w-80 border-l border-border-subtle flex-col gap-10 p-8 bg-white/30 backdrop-blur-sm">
        <div className="flex flex-col gap-8">
           <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Domain Insight</h3>
                <HelpIconTooltip content="Measures the architectural complexity of the current knowledge track." />
              </div>
            </div>
            <div className="p-5 bg-white rounded-3xl border border-border-subtle shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Synthesis Depth</span>
                <Badge label={activeSession.messages.length > 10 ? "Advanced" : "Developing"} color="neutral" />
              </div>
              <div className="h-1 w-full bg-sidebar rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-1000" 
                  style={{ width: `${Math.min(activeSession.messages.length * 5, 100)}%` }} 
                />
              </div>
            </div>
           </div>

           <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">External Sources</p>
                <HelpIconTooltip content="Live research data ingested during this session." />
              </div>
              <div className="flex flex-col gap-3">
                 {foundPapers.length > 0 ? (
                   foundPapers.map((paper, i) => (
                    <a 
                      key={i} 
                      href={paper.link} 
                      target="_blank" 
                      rel="noreferrer"
                      className="group p-4 bg-white rounded-2xl border border-border-subtle shadow-sm flex flex-col gap-2 hover:border-indigo-600 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-indigo-600" />
                        <span className="text-[10px] font-bold truncate max-w-[150px]">{paper.title}</span>
                      </div>
                      <p className="text-[9px] text-text-muted line-clamp-2 leading-relaxed">{paper.summary}</p>
                    </a>
                   ))
                 ) : (
                   <Card padding="20px" className="bg-white/50 border-dashed border-border-subtle flex flex-col items-center gap-3 py-10 opacity-60">
                      <BookOpen size={24} className="text-text-muted" />
                      <p className="text-[10px] font-bold tracking-widest uppercase">No live papers cited</p>
                   </Card>
                 )}
              </div>
           </div>

           <div className="flex flex-col gap-6">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Scientific Directives</p>
              <div className="flex flex-col gap-3">
                 {[
                   { icon: <Target size={16}/>, label: "Factual Precision", active: true },
                   { icon: <Plus size={16}/>, label: "Literature Review", active: false }
                 ].map((d, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-border-subtle shadow-xs">
                       <div className={cn("p-2 rounded-lg", d.active ? "bg-coral/10 text-coral" : "bg-sidebar text-text-muted")}>
                          {d.icon}
                       </div>
                       <span className={cn("text-xs font-bold", d.active ? "text-text-primary" : "text-text-muted")}>{d.label}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="mt-auto p-8 bg-text-primary rounded-[40px] text-white flex flex-col gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-coral/20 blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10 flex flex-col gap-4">
            <GraduationCap size={40} className="text-coral" />
            <p className="font-serif text-xl italic leading-relaxed opacity-90">
              "Mastery is not the accumulation of facts, but the refinement of mental models."
            </p>
            <div className="h-px bg-white/10 w-full" />
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase opacity-40">Architect System</span>
              <span className="text-[10px] font-mono opacity-40">v8.0.4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
