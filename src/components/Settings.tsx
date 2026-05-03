import { useState, useEffect } from "react";
import { Heading, Divider } from "./ui/Typography";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Settings as SettingsIcon, Save, Database, Cpu, Globe, Key } from "lucide-react";
import { Badge } from "./ui/Badge";
import { cn } from "../lib/utils";

export const SettingsTab = () => {
  const [config, setConfig] = useState({
    geminiKey: localStorage.getItem("custom_gemini_key") || "",
    openaiKey: localStorage.getItem("custom_openai_key") || "",
    deepseekKey: localStorage.getItem("custom_deepseek_key") || "",
    vertexToken: localStorage.getItem("custom_vertex_token") || "",
    ollamaUrl: localStorage.getItem("ollama_url") || "http://localhost:11434",
    embeddingModel: localStorage.getItem("embedding_model") || "text-embedding-004",
    preferredLLM: localStorage.getItem("preferred_llm") || "gemini-1.5-flash-latest",
    nasaKey: localStorage.getItem("custom_nasa_key") || "",
    elevenlabsKey: localStorage.getItem("custom_elevenlabs_key") || "",
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("custom_gemini_key", config.geminiKey);
    localStorage.setItem("custom_openai_key", config.openaiKey);
    localStorage.setItem("custom_deepseek_key", config.deepseekKey);
    localStorage.setItem("custom_vertex_token", config.vertexToken);
    localStorage.setItem("ollama_url", config.ollamaUrl);
    localStorage.setItem("embedding_model", config.embeddingModel);
    localStorage.setItem("preferred_llm", config.preferredLLM);
    localStorage.setItem("custom_nasa_key", config.nasaKey);
    localStorage.setItem("custom_elevenlabs_key", config.elevenlabsKey);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const MODELS = [
    { id: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash", provider: "Google" },
    { id: "gemini-1.5-pro-latest", label: "Gemini 1.5 Pro", provider: "Google" },
    { id: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Exp)", provider: "Google" },
    { id: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "OpenAI" },
    { id: "deepseek-chat", label: "DeepSeek V3", provider: "DeepSeek" },
    { id: "deepseek-reasoner", label: "DeepSeek R1", provider: "DeepSeek" }
  ];

  return (
    <div className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto py-12">
      <div className="flex flex-col gap-2 border-b border-border-subtle pb-8">
        <Badge label="System Matrix" color="accent" />
        <Heading level={1} serif className="text-5xl tracking-tight">Architectural Control</Heading>
        <p className="text-xl text-text-secondary font-light">"Refining the cognitive parameters of the learning engine."</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Model Selection */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
               <Cpu size={20} />
             </div>
             <Heading level={3}>Neural Processing</Heading>
          </div>
          <Card padding="32px" className="flex flex-col gap-8 bg-white shadow-xl shadow-indigo-500/5">
             <div className="flex flex-col gap-3">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Primary Inference Model</label>
                <div className="grid grid-cols-1 gap-3">
                   {MODELS.map(m => (
                     <button
                        key={m.id}
                        onClick={() => setConfig({...config, preferredLLM: m.id})}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                          config.preferredLLM === m.id 
                            ? "border-coral bg-coral/5 shadow-sm" 
                            : "border-sidebar bg-sidebar/20 hover:border-border-strong"
                        )}
                     >
                        <div className="flex flex-col">
                           <span className={cn("text-sm font-bold", config.preferredLLM === m.id ? "text-text-primary" : "text-text-secondary")}>{m.label}</span>
                           <span className="text-[10px] uppercase tracking-widest opacity-50">{m.provider} Engine</span>
                        </div>
                        {config.preferredLLM === m.id && <div className="w-2 h-2 rounded-full bg-coral animate-pulse" />}
                     </button>
                   ))}
                </div>
             </div>
          </Card>
        </section>

        {/* API Credentials */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-coral/10 text-coral rounded-xl">
               <Key size={20} />
             </div>
             <Heading level={3}>API Orchestration</Heading>
          </div>
          <Card padding="32px" className="flex flex-col gap-8 bg-white shadow-xl shadow-coral-500/5">
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Google AI Studio Key (Gemini API)</label>
              <Input 
                type="password" 
                placeholder="AIza..." 
                value={config.geminiKey}
                onChange={(e) => setConfig({...config, geminiKey: e.target.value})}
                className="bg-sidebar border-none p-6 text-sm"
              />
              <p className="text-[10px] text-text-muted italic">Note: Use a key from aistudio.google.com. Generative Language API must be enabled.</p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">OpenAI Secret Key</label>
              <Input 
                type="password" 
                placeholder="sk-..." 
                value={config.openaiKey}
                onChange={(e) => setConfig({...config, openaiKey: e.target.value})}
                className="bg-sidebar border-none p-6 text-sm"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">DeepSeek Authorization</label>
              <Input 
                type="password" 
                placeholder="ds-..." 
                value={config.deepseekKey}
                onChange={(e) => setConfig({...config, deepseekKey: e.target.value})}
                className="bg-sidebar border-none p-6 text-sm"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">NASA API Key (for Earth/Space data)</label>
              <Input 
                type="password" 
                placeholder="DEMO_KEY" 
                value={config.nasaKey}
                onChange={(e) => setConfig({...config, nasaKey: e.target.value})}
                className="bg-sidebar border-none p-6 text-sm"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">ElevenLabs API Key (for Podcasts)</label>
              <Input 
                type="password" 
                placeholder="sk_..." 
                value={config.elevenlabsKey}
                onChange={(e) => setConfig({...config, elevenlabsKey: e.target.value})}
                className="bg-sidebar border-none p-6 text-sm"
              />
            </div>
          </Card>

          <Button 
            variant="primary" 
            size="lg" 
            className="w-full mt-auto h-20 rounded-[32px] text-xl font-serif shadow-2xl shadow-coral/20" 
            icon={saved ? <Check size={24} /> : <Save size={24} />}
            onClick={handleSave}
          >
            {saved ? "Neural Links Synchronized" : "Commit Cognitive Changes"}
          </Button>
        </section>
      </div>
    </div>
  );
};

const Check = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
