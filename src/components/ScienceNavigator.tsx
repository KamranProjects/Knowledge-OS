import { useState } from "react";
import { Heading } from "./ui/Typography";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Search, Loader2, BookOpen, GraduationCap, Plus, Check } from "lucide-react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { cn } from "../lib/utils";
import { useStudy } from "../context/StudyContext";

interface Paper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  ingested?: boolean;
}

export const ScienceNavigator = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ingestingId, setIngestingId] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<"searx" | "arxiv" | "nasa" | "openalex" | "gutenberg" | "archive">("searx");
  const { addSource } = useStudy();

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/research/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query, 
          source: activeSource,
          nasaKey: localStorage.getItem("custom_nasa_key")
        }),
      });
      const data = await response.json();
      setResults(Array.isArray(data) ? data : (data.papers || []));
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIngest = async (paper: any) => {
    setIngestingId(paper.id);
    try {
      await addSource(paper.summary, paper.title, "text");
      setResults(prev => prev.map(p => p.id === paper.id ? { ...p, ingested: true } : p));
    } catch (error) {
      console.error("Ingestion failed:", error);
    } finally {
      setIngestingId(null);
    }
  };

  const handlePdfIngest = async (paper: any) => {
    setIngestingId(paper.id);
    try {
      const resp = await fetch("/api/research/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: paper.id, title: paper.title })
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error);
      }
      setResults(prev => prev.map(p => p.id === paper.id ? { ...p, ingested: true } : p));
      alert("PDF Downloaded & Ingested Successfully");
    } catch (error: any) {
      console.error("PDF Ingestion failed:", error);
      alert(error.message);
    } finally {
      setIngestingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-20 flex flex-col gap-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-coral/10 rounded-lg text-coral">
            <Search size={24} />
          </div>
          <Heading level={1} serif>Research Engine</Heading>
        </div>
        <p className="text-text-secondary max-w-2xl text-lg">
          Master any domain. Aggregate intelligence from SearXNG, ArXiv, NASA, and global archives.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2 p-1 bg-sidebar rounded-xl w-fit">
          {[
            { id: "searx", label: "Web Search" },
            { id: "arxiv", label: "ArXiv" },
            { id: "nasa", label: "NASA" },
            { id: "openalex", label: "OpenAlex" },
            { id: "gutenberg", label: "Gutenberg" },
            { id: "archive", label: "Archive.org" }
          ].map(src => (
            <button
              key={src.id}
              onClick={() => setActiveSource(src.id as any)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                activeSource === src.id ? "bg-surface text-coral shadow-sm" : "text-text-muted hover:text-text-primary"
              )}
            >
              {src.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <Input 
              placeholder={`Search ${activeSource.toUpperCase()} database...`} 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-lg h-14 px-6 shadow-sm border-border-strong focus:ring-2 focus:ring-coral/20"
            />
          </div>
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            disabled={isLoading}
            className="h-14 px-8"
            icon={isLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
          >
            {isLoading ? "Searching..." : "Research"}
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {results.length > 0 ? (
          results.map((paper) => (
            <Card key={paper.id} className="p-6 hover:shadow-md transition-shadow group">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-2 flex-1">
                    <h3 className="font-serif text-xl text-text-primary group-hover:text-coral transition-colors leading-tight">
                      {paper.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {paper.authors.slice(0, 3).map((author, i) => (
                        <Badge key={i} color="neutral" label={author} className="text-[10px] uppercase font-bold tracking-tight bg-surface border-border-subtle" />
                      ))}
                      {paper.authors.length > 3 && <span className="text-xs text-text-muted">+{paper.authors.length - 3} more</span>}
                    </div>
                  </div>
                  <Button 
                    variant={paper.ingested ? "secondary" : "primary"}
                    size="sm"
                    onClick={() => paper.id.toLowerCase().endsWith('.pdf') ? handlePdfIngest(paper) : handleIngest(paper)}
                    disabled={paper.ingested || ingestingId === paper.id}
                    icon={paper.ingested ? <Check size={16} /> : ingestingId === paper.id ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  >
                    {paper.ingested ? "In Study Brain" : ingestingId === paper.id ? "Learning..." : paper.id.toLowerCase().endsWith('.pdf') ? "Ingest PDF" : "Add to Study Brain"}
                  </Button>
                </div>
                
                <div className="relative">
                  <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                    {paper.summary}
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none group-hover:hidden" />
                </div>

                <div className="flex justify-between items-center pt-2">
                   <a 
                    href={paper.id} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs text-coral font-bold flex items-center gap-1 hover:underline underline-offset-4"
                  >
                    <BookOpen size={14} />
                    View Original Paper
                  </a>
                  {paper.ingested && (
                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                      <GraduationCap size={14} />
                      AI has "learned" this paper
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : !isLoading && (
          <div className="py-20 flex flex-col items-center justify-center text-center gap-4 bg-surface/30 rounded-3xl border border-dashed border-border-subtle">
            <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center text-text-muted mb-2">
              <Search size={40} />
            </div>
            <div>
              <h3 className="font-serif text-xl text-text-primary">Ready to explore?</h3>
              <p className="text-text-secondary text-sm max-w-xs">
                Search queries against the ArXiv database to find latest breakthroughs in physics, computer science, and more.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
