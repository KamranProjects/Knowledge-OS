import { useState, useEffect } from "react";
import { 
  FileText, 
  Trash2, 
  Download, 
  Upload, 
  Search, 
  X, 
  FileJson,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  BookOpen,
  Plus,
  Zap,
  Microscope
} from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Heading } from "./ui/Typography";
import { Badge } from "./ui/Badge";
import { cn } from "../lib/utils";
import ReactMarkdown from "react-markdown";
import { useStudy, Source } from "../context/StudyContext";
import { extractTextFromFile } from "../lib/ocr";

export const Librarian = () => {
  const { sources: docs, addSource, deleteSource, setActiveChatDoc } = useStudy();
  const [selectedDoc, setSelectedDoc] = useState<Source | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [isProcessingYt, setIsProcessingYt] = useState(false);

  const handleYoutubeIngest = async () => {
    if (!ytUrl.includes("v=")) {
        alert("Please provide a valid YouTube URL");
        return;
    }
    const videoId = ytUrl.split("v=")[1].split("&")[0];
    if (!videoId) return;

    setIsProcessingYt(true);
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId })
      });
      if (!res.ok) throw new Error("Transcript fetch failed");
      const data = await res.json();
      
      const content = `SUMMARY:\n${data.summary}\n\nTRANSCRIPT:\n${data.transcript}`;
      await addSource(content, `YouTube: ${videoId}`, "video/youtube");
      setYtUrl("");
    } catch (e) {
      alert("YouTube ingestion failed.");
    } finally {
      setIsProcessingYt(false);
    }
  };

  const [isOcrPending, setIsOcrPending] = useState(false);

  const applyManualOcr = async () => {
    // For manual OCR on existing docs, we re-trigger the upload flow
    // but force the Vision model.
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,image/*";
    input.onchange = async (ev: any) => {
        const file = ev.target.files[0];
        if (!file) return;
        
        setIsOcrPending(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = (e.target?.result as string).split(",")[1];
            const customKey = localStorage.getItem("custom_gemini_key")?.trim();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (customKey) headers["x-gemini-key"] = customKey;

            try {
                const res = await fetch("/api/ingest-file", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ 
                        fileName: file.name, 
                        fileType: file.type, 
                        base64Data,
                        skipOcr: false // FORCE OCR
                    })
                });

                if (!res.ok) throw new Error("Processing failed");
                const data = await res.json();
                
                // If it was the same doc, we could update it, but simpler to add as new "Deep Analysis" doc
                await addSource(data.text || "No text found", `[VISION]: ${file.name}`, file.type);
                alert("Deep Visual Extraction complete. Check your repository.");
            } catch (err) {
                alert("Visual OCR failed.");
            } finally {
                setIsOcrPending(false);
            }
        };
        reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Attempt high-fidelity text extraction
    let localText = await extractTextFromFile(file);
    if (localText) {
        console.log("Local extraction successful:", localText.length);
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = (e.target?.result as string).split(",")[1];
      try {
        const useDeepOcr = confirm("Cloud-powered Deep Analysis Recommended. Proceed with Gemini Vision? \n\n(Choose 'Cancel' for fast local extraction)");
        
        if (!useDeepOcr && localText.length > 20) {
            // Use local text and skip server 
            await addSource(localText, file.name, file.type);
            
            const customKey = localStorage.getItem("custom_gemini_key")?.trim();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (customKey) headers["x-gemini-key"] = customKey;

            // Sync with server RAG
            await fetch("/api/ingest", {
                method: "POST",
                headers,
                body: JSON.stringify({ sourceId: file.name, text: localText })
            });
            return;
        }

        const customKey = localStorage.getItem("custom_gemini_key")?.trim();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (customKey) headers["x-gemini-key"] = customKey;

        const res = await fetch("/api/ingest-file", {
          method: "POST",
          headers,
          body: JSON.stringify({ 
            fileName: file.name, 
            fileType: file.type, 
            base64Data,
            skipOcr: !useDeepOcr 
          })
        });

        if (!res.ok) throw new Error("Processing failed");
        const data = await res.json();
        await addSource(data.text || localText || "No text found", file.name, file.type);
      } catch (err) {
        alert("High-fidelity ingestion failed. Saving raw text if available.");
        if (localText) await addSource(localText, file.name, file.type);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const exportDoc = (doc: Source, format: "txt" | "json") => {
    const blob = new Blob(
      [format === "json" ? JSON.stringify(doc, null, 2) : doc.content], 
      { type: format === "json" ? "application/json" : "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.name}.${format}`;
    a.click();
  };

  const chatWithDoc = (doc: Source) => {
     setActiveChatDoc(doc);
     alert(`Focused AI on "${doc.name}".`);
  };

  const filteredDocs = docs.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-96 border-r border-border-subtle flex flex-col bg-white">
        <div className="p-8 flex flex-col gap-6">
          <div className="flex justify-between items-center">
             <div className="flex flex-col gap-1">
               <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Repository</h3>
               <p className="text-[10px] text-text-muted">Managed Research Assets</p>
             </div>
             <Button variant="secondary" size="sm" className="rounded-full w-10 h-10 p-0 relative shadow-sm" disabled={isUploading}>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept=".pdf,image/*,.txt,.md" />
                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
             </Button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input className="flex-1 bg-sidebar/50 border-none rounded-xl py-3 px-4 text-[10px] outline-none" placeholder="Paste YouTube URL..." value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} />
              <Button variant="secondary" size="sm" className="rounded-xl w-10 h-10 p-0 shadow-sm" onClick={handleYoutubeIngest} disabled={isProcessingYt || !ytUrl}>
                {isProcessingYt ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
              </Button>
            </div>
          </div>

          <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
             <input type="text" placeholder="Search corpus..." className="w-full pl-12 pr-4 py-4 bg-sidebar/50 rounded-2xl border-none text-sm outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8 flex flex-col gap-3 no-scrollbar">
          {filteredDocs.map((doc) => (
            <div 
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={cn(
                "group p-6 rounded-3xl cursor-pointer transition-all border-2 flex flex-col gap-3",
                selectedDoc?.id === doc.id ? "bg-white border-indigo-600 shadow-xl" : "bg-sidebar/10 border-transparent"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FileText size={18} /></div>
                <button onClick={(e) => { e.stopPropagation(); deleteSource(doc.id); }} className="p-2 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold truncate text-text-primary">{doc.name}</span>
                <span className="text-[10px] text-text-muted">{new Date(doc.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-sidebar/5 overflow-hidden">
        {selectedDoc ? (
          <div className="flex flex-col h-full animate-in fade-in zoom-in-98 duration-500">
             <div className="h-24 bg-white border-b border-border-subtle px-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white"><FileText size={24} /></div>
                   <div className="flex flex-col">
                      <h2 className="text-xl font-serif text-text-primary">{selectedDoc.name}</h2>
                      <Badge label={selectedDoc.type.split("/")[1]?.toUpperCase() || "TEXT"} color="neutral" />
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <Button variant="secondary" size="sm" className="rounded-xl px-6" icon={<Sparkles size={16} />} onClick={() => chatWithDoc(selectedDoc)}>Focus Synth</Button>
                   <button 
                     onClick={applyManualOcr} 
                     disabled={isOcrPending}
                     className="px-4 py-3 bg-white border border-border-subtle rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-sidebar/5 transition-all"
                   >
                     {isOcrPending ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                     Visual OCR
                   </button>
                   <div className="flex rounded-2xl border border-border-subtle overflow-hidden">
                      <button onClick={() => exportDoc(selectedDoc, "txt")} className="px-4 py-3 bg-white text-xs font-bold">Text</button>
                      <button onClick={() => exportDoc(selectedDoc, "json")} className="px-4 py-3 bg-white border-l text-xs font-bold">JSON</button>
                   </div>
                   <button onClick={() => setSelectedDoc(null)} className="p-3 bg-white rounded-2xl border hover:text-red-500"><X size={20} /></button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-12 bg-white m-8 rounded-[48px] shadow-sm border border-border-subtle no-scrollbar">
                <div className="max-w-4xl mx-auto flex flex-col gap-10">
                   <div className="markdown-body text-lg leading-relaxed text-text-primary">
                      <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
                   </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-20">
             <Clock size={64} className="mb-12" />
             <Heading level={2} serif>Librarian Awaiting Input</Heading>
          </div>
        )}
      </div>
    </div>
  );
};
