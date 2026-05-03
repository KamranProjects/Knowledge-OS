import { useState, useRef, useEffect } from "react";
import { getDoc, doc } from "firebase/firestore";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Login } from "./components/Login";
import { ProfileSetup } from "./components/ProfileSetup";
import { useAuth } from "./context/AuthContext";
import { db } from "./lib/firebase";
import { 
  DashboardTab, 
  LibrarianTab,
  ExamsTab,
  PlannerTab,
  CoursesTab
} from "./components/MainViews";
import { Notebook } from "./components/Notebook";
import { ScienceNavigator } from "./components/ScienceNavigator";
import { KnowledgePlanner } from "./components/SciencePlanner";
import { SettingsTab } from "./components/Settings";
import { ChatBubble, TypingIndicator, ChatInput } from "./components/ui/Chat";
import { ModeSelector, StudyModeId } from "./components/ui/ModeSelector";
import { Send, Sparkles, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "./lib/utils";
import { callGemini } from "./lib/gemini";
import { useStudy } from "./context/StudyContext";

const SYSTEM_PROMPTS: Record<string, string> = {
  feynman: `You are in 'Feynman Mode'. Your goal is to explain complex concepts using simple analogies and beginner-friendly language. Break down the topic as if explaining to a 10-year-old.`,
  drill: `You are in 'Drill Mode'. Your goal is rapid-fire questioning. Ask one concise question at a time. Be strict and demanding.`,
  teacher: `You are in 'Teacher Mode'. Your goal is to provide structured, academic lessons. Follow a logical syllabus flow.`,
  buddy: `You are in 'Buddy Mode'. Your goal is casual, peer-to-peer learning. Make studying feel like a chill hangout.`,
  examiner: `You are in 'Examiner Mode'. You are strictly evaluating the user's understanding. Ask for definitions or full explanations. Grade the response out of 10.`,
  visual: `You are in 'Visual Mode'. You focus on describing flows, diagrams, and mental maps. Use markdown tables, arrows and structured lists.`,
};

interface ChatMessage {
  role: "user" | "model" | "assistant";
  content: string;
}

export default function App() {
  const { 
    activeTab, setActiveTab, 
    sources, activeSourceIds, 
    activeChatDoc, setActiveChatDoc,
    chatHistory, setChatHistory,
    draftPrompt, setDraftPrompt
  } = useStudy();
  
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [studyMode, setStudyMode] = useState<StudyModeId>("feynman");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(chatHistory.length > 0 ? chatHistory : []);
  const [inputMessage, setInputMessage] = useState("");
  const [imageAttachment, setImageAttachment] = useState<{data: string, mimeType: string, extractedText?: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  
  const preferredModel = localStorage.getItem("preferred_llm") || "gemini-1.5-flash-latest";
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync draft prompt from context
  useEffect(() => {
    if (draftPrompt) {
        setInputMessage(draftPrompt);
        setActiveTab("study");
        // Clear it in the next tick to avoid render cycle conflict
        const timer = setTimeout(() => setDraftPrompt(""), 0);
        return () => clearTimeout(timer);
    }
  }, [draftPrompt, setActiveTab, setDraftPrompt]);

  useEffect(() => {
    if (user) {
        const checkProfile = async () => {
            console.log("Checking profile for user:", user?.uid);
            try {
                const docRef = doc(db, "users", user!.uid);
                const snap = await getDoc(docRef);
                console.log("Profile snap exists:", snap.exists());
                if (snap.exists()) setProfile(snap.data());                
            } catch (e) {
                console.error("Profile check failed", e);
            }
            setProfileChecked(true);
        }
        checkProfile();
    } else {
        setProfileChecked(true);
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (!user) return <Login />;
  if (!profileChecked) return <div className="flex h-screen items-center justify-center font-serif text-2xl animate-pulse">Loading your workspace...</div>;
  if (!profile) return <ProfileSetup onComplete={(data?: any) => {
    if (data) setProfile(data);
    else window.location.reload();
  }} />;

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || inputMessage;
    if (textToSend === "RESET_CHAT") {
        setChatMessages([]);
        setChatHistory([]);
        return;
    }
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: textToSend };
    setChatMessages(prev => {
        const next = [...prev, userMsg];
        setChatHistory(next);
        return next;
    });
    if (!textOverride) {
        setInputMessage("");
        setImageAttachment(null);
    }
    setIsLoading(true);

    try {
      // 1. Fetch Context + Memory from RAG (Backend)
      const customKey = localStorage.getItem("custom_gemini_key")?.trim();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (customKey) headers["x-gemini-key"] = customKey;

      const ctxResponse = await fetch("/api/context", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: textToSend })
      });

      if (!ctxResponse.ok) throw new Error("RAG Context failed");
      const { context, memory } = await ctxResponse.json();

      // 2. Build instructions
      const systemInstruction = `${SYSTEM_PROMPTS[studyMode] || "You are a helpful study assistant."}
      
      ${activeChatDoc ? `
      FOCUSED DOCUMENT CONTEXT (Active Target):
      TITLE: ${activeChatDoc.name}
      CONTENT: ${activeChatDoc.content}
      ` : ""}

      ADAPTIVE MEMORY:
      The user prefers: ${memory || "No prior data. Observe and adapt."}

      STUDY MATERIALS CONTEXT:
      ${context}
      
      INSTRUCTIONS:
      - Always respect the user's preferred learning style mentioned in memory.
      - If answer is in notes, prefix with [FROM NOTES].
      - Keep responses concise, accurate and engaging.`;

      // 3. Call AI via Utility
      let finalPrompt = textToSend;
      if (imageAttachment?.extractedText) {
        finalPrompt = `[EXTRACTED CONTENT FROM ATTACHMENT]:\n${imageAttachment.extractedText}\n\n[USER MESSAGE]:\n${textToSend}`;
      }

      const response = await callGemini({
        model: preferredModel,
        contents: [
          ...chatMessages.map(m => ({
            role: m.role === "user" ? "user" : "model" as const,
            parts: [{ text: m.content }]
          })),
          { role: "user", parts: [{ text: finalPrompt }] }
        ],
        systemInstruction,
        attachments: imageAttachment ? [{ data: imageAttachment.data, mimeType: imageAttachment.mimeType }] : []
      });

      const aiText = response.text;
      if (!aiText) {
         throw new Error("Architect encountered a cognitive stall. The model returned an empty response, potentially due to safety filters.");
      }

      setChatMessages(prev => {
          const next = [...prev, { role: "model" as const, content: aiText }];
          setChatHistory(next);
          return next;
      });
      setImageAttachment(null);

      // 4. Update Memory asynchronously
      (async () => {
        try {
          const memPrompt = `Extract any user learning preferences, confusion points, or stylistic requests from this message: "${textToSend}". 
          Return ONLY a few short declarative statements. If none, return NO_PREFS.`;
          
          const prefResult = await callGemini({
            model: preferredModel,
            contents: [{ role: "user", parts: [{ text: memPrompt }] }]
          });

          const prefs = prefResult.text || "";
          if (prefs && !prefs.includes("NO_PREFS")) {
           const customKey = localStorage.getItem("custom_gemini_key")?.trim();
           const headers: Record<string, string> = { "Content-Type": "application/json" };
           if (customKey) headers["x-gemini-key"] = customKey;

           await fetch("/api/memory", {
             method: "POST",
             headers,
             body: JSON.stringify({ text: prefs })
           });
          }
        } catch (e) {}
      })();

    } catch (error: any) {
      console.error(error);
      const errorMsg = error?.message || "Unknown error";
      setChatMessages(prev => [...prev, { role: "model", content: `Error: Could not reach Gemini (${errorMsg}). Please check your connection.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    setIsLoading(true);
    const activeContent = sources
      .filter(s => activeSourceIds.includes(s.id))
      .map(s => s.content);
    
    if (activeContent.length === 0) {
      alert("Please select at least one source in the library.");
      setIsLoading(false);
      return;
    }

    try {
      const prompt = `Based on the following materials, generate flashcards.
      Materials: ${activeContent.join("\n\n")}
      Return ONLY a JSON array: [{ "front": "...", "back": "..." }].`;

      const response = await callGemini({
        model: preferredModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const cards = JSON.parse(response.text || "[]");
      if (Array.isArray(cards)) {
        setFlashcards(cards);
        setActiveTab("exams");
      }
    } catch (e) {
      alert("Failed to extract cards.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col min-w-0">
        <TopBar title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} />
        
        <div className="flex-1 overflow-y-auto w-full">
          {activeTab === "dashboard" && (
            <DashboardTab 
                setActiveTab={setActiveTab} 
                sources={sources} 
                weakTopics={weakTopics} 
                profile={profile}
            />
          )}
          
          {activeTab === "library" && <LibrarianTab />}

          {activeTab === "study" && (
            <div className="flex flex-col h-full animate-in fade-in duration-700 relative">
              <div className="flex-1 overflow-y-auto flex flex-col items-center pb-40">
                <div className="w-full max-w-4xl flex flex-col gap-8 p-8 md:p-12">
                  {chatMessages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 mt-20">
                      <div className="w-24 h-24 bg-white shadow-2xl rounded-[40px] flex items-center justify-center text-coral mb-10">
                        <Brain size={48} />
                      </div>
                      <h1 className="font-serif text-5xl text-text-primary tracking-tight mb-4">How can we expand <br/> your knowledge today?</h1>
                      <p className="text-text-secondary max-w-md text-lg leading-relaxed">
                        Select your active cognitive tools and let's begin the synthesis. Currently leveraging {activeSourceIds.length} sources.
                      </p>
                      <div className="mt-12 flex flex-col gap-6 items-center">
                         <ModeSelector active={studyMode} onChange={setStudyMode} />
                         {activeChatDoc && (
                           <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl animate-in zoom-in duration-300">
                             <Sparkles size={14} className="text-indigo-600" />
                             <span className="text-xs font-bold text-indigo-700">Focused on: {activeChatDoc.name}</span>
                             <button 
                               onClick={() => setActiveChatDoc(null)}
                               className="ml-2 hover:text-red-500 transition-colors"
                             >
                               <Send size={12} className="rotate-45" /> 
                             </button>
                           </div>
                         )}
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={cn(
                      "w-full flex flex-col gap-2",
                      msg.role === "user" ? "items-end" : "items-start"
                    )}>
                      <ChatBubble 
                        role={msg.role as any} 
                        textToSpeak={msg.content}
                        source={msg.content.includes("[FROM NOTES]") ? "notes" : undefined}
                      >
                        <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-sidebar prose-pre:p-4 prose-pre:rounded-2xl">
                          <ReactMarkdown>
                            {msg.content.replace("[FROM NOTES]", "")}
                          </ReactMarkdown>
                        </div>
                      </ChatBubble>
                    </div>
                  ))}
                  {isLoading && <div className="ml-4"><TypingIndicator /></div>}
                  <div ref={chatEndRef} />
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-canvas via-canvas/95 to-transparent flex justify-center z-10">
                <div className="w-full max-w-3xl">
                      <ChatInput 
                        onSend={handleSendMessage}
                        isLoading={isLoading}
                        imageAttachment={imageAttachment}
                        setImageAttachment={setImageAttachment}
                        initialValue={inputMessage}
                        placeholder={`Message Architect (${studyMode} mode)...`}
                        quickActions={[
                          { icon: null, label: "Teach Next", text: "Based on my current plan, please teach me the next available module." },
                          { icon: null, label: "Analogy", text: "Explain the current topic using a simple analogy" },
                          { icon: null, label: "Deep Dive", text: "I want to go deeper into the technical details." },
                          { icon: null, label: "Clear Chat", text: "RESET_CHAT" }
                        ]}
                      />
                </div>
              </div>
            </div>
          )}

          {activeTab === "exams" && (
            <ExamsTab 
              flashcards={flashcards} 
              handleGenerateFlashcards={handleGenerateFlashcards} 
              setWeakTopics={setWeakTopics}
            />
          )}

          {activeTab === "planner" && <KnowledgePlanner />}
          {activeTab === "courses" && <CoursesTab />}
          {activeTab === "notebook" && <Notebook setActiveTab={setActiveTab} />}
          {activeTab === "research" && <ScienceNavigator />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}
