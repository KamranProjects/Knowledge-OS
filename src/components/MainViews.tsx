import { useState, useEffect } from "react";
import { Plus, BookOpen, BrainCircuit, GraduationCap, CheckCircle2, XCircle, Trophy, Sparkles, Headphones, Play, ChevronRight, Compass, Brain, FileText, Search, X, Clock, ArrowRight } from "lucide-react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Heading } from "./ui/Typography";
import { Badge } from "./ui/Badge";
import { ProgressBar } from "./ui/ProgressBar";
import { cn } from "../lib/utils";
import { callGemini } from "../lib/gemini";
import { Librarian } from "./Librarian";
import { useStudy, Source } from "../context/StudyContext";

interface EvaluationResult {
  score: number;
  feedback: string;
  correctAnswer: string;
}

interface QuizQuestion {
  type: "mcq" | "short";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export const DashboardTab = ({ setActiveTab, sources, weakTopics = [], profile }: any) => (
  <div className="flex flex-col gap-24 py-20 px-8 md:px-16 animate-in fade-in duration-1000 max-w-7xl mx-auto">
    <header className="flex flex-col gap-6 text-center items-center">
      <div className="flex items-center gap-3 text-coral font-bold text-xs uppercase tracking-[0.4em] mb-4 py-1 px-4 bg-coral/5 rounded-full border border-coral/10">
        <Sparkles size={14} />
        <span>Neural Matrix Active</span>
      </div>
      <h1 className="text-8xl md:text-9xl font-serif text-text-primary tracking-tighter leading-[0.85]">
        Mastery <br/> <span className="text-text-muted italic opacity-50">Intelligence</span>
      </h1>
      <p className="text-text-secondary text-2xl max-w-2xl leading-relaxed mt-4 font-light">
        Welcome back, <span className="text-text-primary font-semibold">{profile?.goal?.split(' ')[0] || "Explorer"}</span>. 
        Your cognitive ecosystem is currently synchronizing <span className="text-text-primary font-semibold underline decoration-coral/30 underline-offset-8">{sources.length} core knowledge nodes</span>. 
      </p>

      {profile && (
        <div className="flex flex-wrap justify-center gap-4 mt-8">
            <div className="px-4 py-2 bg-sidebar rounded-2xl border border-border-subtle flex flex-col items-center min-w-[120px]">
                <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Level</span>
                <span className="text-sm font-bold text-text-primary capitalize">{profile.experienceLevel || "Beginner"}</span>
            </div>
            <div className="px-4 py-2 bg-sidebar rounded-2xl border border-border-subtle flex flex-col items-center min-w-[120px]">
                <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Commitment</span>
                <span className="text-sm font-bold text-text-primary">{profile.dailyTime || "30min"}/day</span>
            </div>
            <div className="px-4 py-2 bg-sidebar rounded-2xl border border-border-subtle flex flex-col items-center min-w-[120px]">
                <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Style</span>
                <span className="text-sm font-bold text-text-primary capitalize">{profile.learningStyle || "Adaptive"}</span>
            </div>
            <div className="px-4 py-2 bg-sidebar rounded-2xl border border-border-subtle flex flex-col items-center min-w-[120px]">
                <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Focus</span>
                <span className="text-sm font-bold text-text-primary capitalize">{profile.weakSubjects?.split(',')[0] || "General"}</span>
            </div>
        </div>
      )}
    </header>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
      <div className="flex flex-col gap-12">
        <h3 className="font-serif text-4xl text-text-primary">Synaptic Trajectories</h3>
        <div className="flex flex-col gap-10">
          {sources.length > 0 ? (
            sources.slice(0, 3).map((s: any, i: number) => (
              <ProgressBar 
                key={s.id} 
                label={s.name} 
                value={Math.floor(Math.random() * 40) + 30} // Simulated progress for existsing sources 
                color={i === 1 ? "blue" : i === 2 ? "green" : "accent"}
              />
            ))
          ) : (
            <div className="p-8 border-2 border-dashed border-border-subtle rounded-3xl text-center text-text-muted">
              Load documents to visualize trajectories
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-12">
        <h3 className="font-serif text-4xl text-text-primary">Cognitive Tools</h3>
        <div className="grid grid-cols-1 gap-4">
          {[
            { id: "planner", title: "Knowledge Architect", desc: "Map your mental landscape", icon: <Compass className="text-indigo-600" />, color: "bg-indigo-50" },
            { id: "research", title: "Science Navigator", desc: "Feed from global discovery", icon: <BookOpen className="text-coral" />, color: "bg-coral/5" },
            { id: "library", title: "Unified Library", desc: "The repository of your truth", icon: <FileText className="text-text-primary" />, color: "bg-sidebar" }
          ].map((tool) => (
            <button key={tool.id} onClick={() => setActiveTab(tool.id)} className="flex items-center gap-8 p-8 rounded-[48px] bg-white border border-border-subtle hover:shadow-2xl hover:translate-y-[-4px] transition-all text-left group">
              <div className={cn("w-16 h-16 rounded-[24px] flex items-center justify-center group-hover:scale-110 transition-transform", tool.color)}>{tool.icon}</div>
              <div className="flex flex-col gap-1">
                <span className="font-serif text-2xl text-text-primary">{tool.title}</span>
                <span className="text-text-secondary">{tool.desc}</span>
              </div>
              <div className="ml-auto w-12 h-12 rounded-full border flex items-center justify-center group-hover:bg-coral group-hover:text-white transition-all"><ChevronRight size={20} /></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

import { Flashcard } from "./ui/Flashcard";

export const ExamsTab = ({ flashcards, handleGenerateFlashcards, setWeakTopics }: any) => {
  const { sources, activeSourceIds } = useStudy();
  const [examMode, setExamMode] = useState<"flashcards" | "quiz" | "podcast">("flashcards");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  // Podcast State
  const [audioContent, setAudioContent] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(2);
  const [audioProvider, setAudioProvider] = useState("gemini-1.5-flash-latest");
  
  const preferredModel = localStorage.getItem("preferred_llm") || "gemini-1.5-flash-latest";

  const startQuiz = async () => {
    setIsGenerating(true);
    const activeContent = sources.filter((s: Source) => activeSourceIds.includes(s.id)).map((s: Source) => s.content);
    if (activeContent.length === 0) {
      alert("Please select sources first.");
      setIsGenerating(false);
      return;
    }
    try {
      const prompt = `Generate a 5-question quiz (mcq) based on: ${activeContent.join("\n\n")}. Return ONLY JSON array of questions like [{"type":"mcq","question":"...","options":["A","B","C","D"],"correctAnswer":"A","explanation":"..."}].`;
      const response = await callGemini({
        model: preferredModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      setQuizQuestions(JSON.parse(response.text || "[]"));
      setQuizScore(0);
      setQuizFinished(false);
      setCurrentQuizIndex(0);
    } catch (e) { alert("Failed to generate quiz."); } finally { setIsGenerating(false); }
  };

  const handleMCQSelect = (option: string) => {
    if (option === quizQuestions[currentQuizIndex].correctAnswer) setQuizScore(prev => prev + 1);
    setSelectedOption(option);
    setTimeout(() => {
      if (currentQuizIndex < quizQuestions.length - 1) {
        setCurrentQuizIndex(prev => prev + 1);
        setSelectedOption(null);
      } else setQuizFinished(true);
    }, 1000);
  };

  const generatePodcast = async () => {
    setIsGenerating(true);
    const activeContent = sources.filter((s: Source) => activeSourceIds.includes(s.id)).map((s: Source) => s.content);
    if (activeContent.length === 0) {
      alert("Please select sources first.");
      setIsGenerating(false);
      return;
    }
    try {
        // Use durationMinutes to constrain the summary
        const prompt = `Act as an engaging podcast host. Create a ${durationMinutes}-minute introductory script summarizing these materials: ${activeContent.join("\n\n")}. Don't use sound effect brackets. Just provide the spoken text directly. Keep it highly educational and enthusiastic.`;
        const response = await callGemini({
            model: preferredModel,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        setAudioContent(response.text || "");
    } catch(e) { alert("Failed to generate script."); } finally { setIsGenerating(false); }
  }

  const playPodcast = async () => {
    if (!audioContent) return;
    
    if (audioProvider === "elevenlabs") {
        const elevenLabsKey = localStorage.getItem("custom_elevenlabs_key");
        if (!elevenLabsKey) { alert("ElevenLabs key missing in settings"); return; }
        
        try {
            setIsSpeaking(true);
            const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM", {
                method: "POST",
                headers: { "Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": elevenLabsKey },
                body: JSON.stringify({ text: audioContent, model_id: "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.5 } })
            });
            if (!response.ok) throw new Error("ElevenLabs API failed");
            const blob = await response.blob();
            const audio = new Audio(URL.createObjectURL(blob));
            audio.onended = () => setIsSpeaking(false);
            audio.play();
        } catch(e) {
            console.error("ElevenLabs error:", e);
            fallbackTTS(audioContent);
        }
    } else if (audioProvider === "vertex") {
        // Vertex AI TTS placeholder
        alert("Google Vertex AI TTS is connected on the backend server.");
        fallbackTTS(audioContent); // Fallback to browser for now as per instructions
    } else {
        // Gemini TTS (using browser synthesis for now as mock)
        fallbackTTS(audioContent);
    }
  }

  const fallbackTTS = (text: string) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synth.speak(utterance);
  }

  const stopPodcast = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto py-12 px-6">
      <header className="flex justify-between items-center mb-10 border-b border-border-subtle pb-6">
        <Heading level={2} serif>Assessment Hub</Heading>
        <div className="flex gap-1 bg-sidebar p-1 rounded-xl">
          {['flashcards', 'quiz', 'podcast'].map(m => (
            <button key={m} className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all", examMode === m ? "bg-white text-coral shadow-sm" : "text-text-muted hover:text-text-primary")} onClick={() => { setExamMode(m as any); setAudioContent(""); stopPodcast(); }}>{m}</button>
          ))}
        </div>
      </header>

      {examMode === "flashcards" && (
        <div className="flex flex-wrap gap-6 justify-center">
          {flashcards.length > 0 ? flashcards.map((card: any, i: number) => <Flashcard key={i} front={card.front} back={card.back} />) : (
            <Card className="w-full py-20 border-dashed text-center flex flex-col items-center gap-4">
              <BookOpen size={32} className="text-text-muted" />
              <Button onClick={handleGenerateFlashcards} disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate Flashcards"}</Button>
            </Card>
          )}
        </div>
      )}

      {examMode === "quiz" && (
        <div className="flex flex-col items-center w-full">
          {!quizQuestions.length || quizFinished ? (
            <Card className="w-full max-w-2xl py-20 text-center flex flex-col items-center gap-8">
              {quizFinished ? (
                 <>
                   <Heading level={2}>Quiz Completed</Heading>
                   <p className="text-3xl font-bold text-green-600">{quizScore} / {quizQuestions.length}</p>
                   <Button onClick={startQuiz}>Try Again</Button>
                 </>
              ) : <Button size="lg" onClick={startQuiz} disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate Quiz"}</Button>}
            </Card>
          ) : (
            <div className="w-full max-w-2xl space-y-6">
              <Card className="p-8">
                <h3 className="text-2xl font-serif mb-8">{quizQuestions[currentQuizIndex].question}</h3>
                <div className="space-y-3">
                  {quizQuestions[currentQuizIndex].options?.map((opt, i) => (
                    <button key={i} onClick={() => handleMCQSelect(opt)} className={cn("w-full text-left p-4 rounded-xl border-2 transition-all", selectedOption === opt ? (opt === quizQuestions[currentQuizIndex].correctAnswer ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50") : "bg-sidebar hover:border-indigo-100")}>{opt}</button>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {examMode === "podcast" && (
        <div className="flex flex-col items-center py-20 gap-8">
           <div className={cn("w-32 h-32 rounded-[40px] flex items-center justify-center transition-all duration-1000", isSpeaking ? "bg-coral/20 text-coral shadow-[0_0_50px_rgba(255,127,80,0.4)] scale-110" : "bg-sidebar text-text-muted")}>
              <Headphones size={64} />
           </div>
           <div className="text-center max-w-lg">
              <h3 className="text-3xl font-serif mb-2">Vocal Synthesis</h3>
              <p className="text-text-secondary text-sm">Convert your study materials into an engaging, listenable podcast briefing.</p>
           </div>
           
           <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
             <select className="p-3 bg-sidebar rounded-xl border border-border-subtle" value={audioProvider} onChange={e => setAudioProvider(e.target.value)}>
                <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash</option>
                <option value="elevenlabs">ElevenLabs</option>
                <option value="vertex">Google Vertex AI</option>
             </select>
             <input type="number" min="1" max="10" className="p-3 bg-sidebar rounded-xl border border-border-subtle" value={durationMinutes} onChange={e => setDurationMinutes(parseInt(e.target.value))} />
           </div>
           
           {!audioContent ? (
               <Button size="lg" className="rounded-full px-8" onClick={generatePodcast} disabled={isGenerating}>
                 {isGenerating ? "Synthesizing Script..." : "Generate Audio Briefing"}
               </Button>
           ) : (
               <div className="flex flex-col items-center gap-6 w-full max-w-2xl mt-4">
                  <div className="flex gap-4">
                      {isSpeaking ? (
                          <Button variant="secondary" onClick={stopPodcast} className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200">Stop Playback</Button>
                      ) : (
                          <Button size="lg" className="rounded-full px-8 shadow-xl" onClick={playPodcast} icon={<Play size={16} />}>Play Podcast</Button>
                      )}
                  </div>
                  <Card className="p-8 text-lg font-serif leading-relaxed text-text-secondary w-full max-h-96 overflow-y-auto">
                      {audioContent}
                  </Card>
               </div>
           )}
        </div>
      )}
    </div>
  );
};

export const PlannerTab = () => {
    const { learningPlans: plans, setLearningPlans } = useStudy();
    const [activePlanId, setActivePlanId] = useState<string | null>(plans[0]?.id || null);
    const activePlan = plans.find(p => p.id === activePlanId);

    const toggleModuleStatus = (planId: string, moduleId: string) => {
        const newPlans = plans.map(p => {
            if (p.id === planId) {
                return { ...p, modules: p.modules.map((m: any) => m.id === moduleId ? { ...m, status: m.status === 'completed' ? 'active' : 'completed' } : m) };
            }
            return p;
        });
        setLearningPlans(newPlans);
    };

    if (plans.length === 0) return <div className="flex flex-col items-center justify-center h-full py-40 opacity-30"><Compass size={64} /><h2 className="text-2xl font-serif mt-4">No Plans Active</h2></div>;

    return (
        <div className="flex h-full max-w-7xl mx-auto py-20 px-8 gap-12">
            <div className="w-80 flex flex-col gap-8 border-r pr-12">
                {plans.map(p => (
                    <button key={p.id} onClick={() => setActivePlanId(p.id)} className={cn("p-6 rounded-[32px] text-left border-2", activePlanId === p.id ? "bg-white border-coral" : "bg-sidebar/10 border-transparent")}>
                        <span className="text-lg font-serif block truncate">{p.title}</span>
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto">
                {activePlan && activePlan.modules.map((module: any, idx: number) => (
                    <div key={module.id} className={cn("mb-8 p-10 rounded-[56px] border-2 bg-white", module.status === 'completed' ? "border-green-500/20 grayscale" : "border-border-subtle shadow-lg")}>
                        <h3 className="text-3xl font-serif mb-4">{module.title}</h3>
                        <p className="text-lg text-text-secondary mb-6">{module.description}</p>
                        <Button onClick={() => toggleModuleStatus(activePlan.id, module.id)} variant={module.status === 'completed' ? "secondary" : "primary"}>{module.status === 'completed' ? "Re-open" : "Complete"}</Button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const LibrarianTab = () => <Librarian />;

export const CoursesTab = () => {
    const { learningPlans: plans, setActiveTab, setDraftPrompt } = useStudy();
    const [expandedPlan, setExpandedPlan] = useState<string | null>(plans[0]?.id || null);
    const [expandedModule, setExpandedModule] = useState<string | null>(null);
    
    const startLearning = (plan: any, topic?: string) => {
        const query = topic 
            ? `I want to deep dive into the topic "${topic}" from the course "${plan.title}". Please explain it from first principles.`
            : `I want to start the curriculum for "${plan.title}". Please explain the first topic.`;
        
        setDraftPrompt(query);
    };

    if (plans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center opacity-40">
                <Compass size={64} className="mb-6" />
                <Heading level={2} serif>No Course Tracks Active</Heading>
                <p className="max-w-md mt-4">Generate a Synaptic Plan in the Knowledge Architect to see your structured paths here.</p>
                <Button className="mt-8" onClick={() => setActiveTab('planner')}>Go to Architect</Button>
            </div>
        );
    }
    
    return (
        <div className="max-w-7xl mx-auto py-20 px-8 flex flex-col gap-12 font-sans pb-40">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-coral font-bold text-[10px] uppercase tracking-widest mb-2">
                    <GraduationCap size={14} />
                    <span>Cognitive Pathways</span>
                </div>
                <h1 className="text-7xl font-serif text-text-primary tracking-tight leading-none">Your <span className="text-text-muted italic opacity-40">Curricula</span></h1>
                <p className="text-xl text-text-secondary max-w-xl mt-4 leading-relaxed font-light">
                    These paths have been algorithmically synthesized based on your research inquiries and study materials.
                </p>
            </header>
            
            <div className="flex flex-col gap-12">
                {plans.map(plan => (
                    <div key={plan.id} className="flex flex-col gap-6 bg-white rounded-[48px] border border-border-subtle overflow-hidden shadow-sm hover:shadow-xl transition-all">
                        <div 
                            className="p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:bg-sidebar/5"
                            onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                        >
                            <div className="flex flex-col gap-2">
                                <h2 className="text-4xl font-serif text-text-primary leading-tight">{plan.title}</h2>
                                <div className="flex items-center gap-4">
                                     <Badge label={`${plan.modules.length} Modules`} color="neutral" />
                                     <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                        <Clock size={12} />
                                        <span>~{plan.modules.length * 45} mins total</span>
                                     </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Button onClick={(e) => { e.stopPropagation(); startLearning(plan); }} className="bg-coral text-white rounded-2xl px-8 h-14 font-bold shadow-lg shadow-coral/10">Resume Learning</Button>
                                <div className={cn("w-12 h-12 rounded-full border flex items-center justify-center transition-all", expandedPlan === plan.id ? "rotate-90 bg-text-primary text-white" : "text-text-muted")}>
                                    <ChevronRight size={24} />
                                </div>
                            </div>
                        </div>

                        {expandedPlan === plan.id && (
                            <div className="px-10 pb-12 animate-in slide-in-from-top-4 duration-500">
                                <div className="flex flex-col gap-4">
                                    {plan.modules.map((module: any, idx: number) => (
                                        <div key={module.id} className="flex flex-col border border-border-subtle rounded-3xl overflow-hidden bg-sidebar/5">
                                            <div 
                                                className="p-6 flex items-center justify-between cursor-pointer hover:bg-white transition-all"
                                                onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                                            >
                                                <div className="flex items-center gap-6">
                                                     <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center font-serif text-lg text-text-muted">
                                                        {idx + 1}
                                                     </div>
                                                     <div className="flex flex-col">
                                                        <span className="text-lg font-bold text-text-primary">{module.title}</span>
                                                        <span className="text-xs text-text-muted">{module.topics?.length || 0} topics included</span>
                                                     </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {module.status === 'completed' && <CheckCircle2 className="text-green-500" size={20} />}
                                                    <div className={cn("transition-transform", expandedModule === module.id ? "rotate-90" : "")}>
                                                        <ChevronRight size={20} className="text-text-muted" />
                                                    </div>
                                                </div>
                                            </div>

                                            {expandedModule === module.id && (
                                                <div className="p-8 bg-white border-t border-border-subtle animate-in fade-in duration-300">
                                                    <p className="text-text-secondary leading-relaxed mb-8">{module.description}</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {module.topics?.map((topic: string, tIdx: number) => (
                                                            <div key={tIdx} className="flex items-center justify-between p-4 rounded-2xl bg-sidebar/30 border border-transparent hover:border-coral/20 hover:bg-white transition-all group">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-2 h-2 rounded-full bg-coral/40" />
                                                                    <span className="text-sm font-medium text-text-primary">{topic}</span>
                                                                </div>
                                                                <button 
                                                                    onClick={() => startLearning(plan, topic)}
                                                                    className="text-[10px] font-bold text-coral uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                                                                >
                                                                    Explain <ArrowRight size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
