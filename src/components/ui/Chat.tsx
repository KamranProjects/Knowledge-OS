import { extractTextFromFile } from "@/src/lib/ocr";
import { type ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "@/src/lib/utils";
import { Volume2, VolumeX, Send, Paperclip, Youtube, BrainCircuit, X, Loader2 } from "lucide-react";

// --- Source Tag for AI context ---
export const SourceTag = ({ type = "notes" }: { type?: "notes" | "extra" }) => {
  const isNotes = type === "notes";
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase mb-1 w-fit",
      isNotes ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-coral/10 text-coral border border-coral/20"
    )}>
      {isNotes ? "📄 From Notes" : "✨ Extra Knowledge"}
    </span>
  );
};

// --- Option Selector (The "Ask User" feature) ---
export interface ChatOption {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface OptionSelectorProps {
  label?: string;
  options: ChatOption[];
  style?: "card" | "pill";
  onSelect: (id: string, label: string) => void;
  disabled?: boolean;
}

export const OptionSelector = ({ label, options, style = "card", onSelect, disabled }: OptionSelectorProps) => {
  const [picked, setPicked] = useState<string | null>(null);

  const handleClick = (opt: ChatOption) => {
    if (disabled || picked) return;
    setPicked(opt.id);
    onSelect(opt.id, opt.label);
  };

  return (
    <div className="flex flex-col gap-2 mt-2 animate-msg-in">
      {label && <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = picked === opt.id;
          const isDisabled = disabled || (picked && !isSelected);
          
          if (style === "card") {
            return (
              <button
                key={opt.id}
                disabled={isDisabled}
                onClick={() => handleClick(opt)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 text-sm font-medium",
                  isSelected 
                    ? "bg-coral text-white border-coral shadow-lg shadow-coral/20" 
                    : "bg-surface border-border-strong text-text-primary hover:border-coral hover:bg-coral/5",
                  isDisabled && !isSelected && "opacity-40 cursor-not-allowed"
                )}
              >
                {opt.icon && <span className="text-base">{opt.icon}</span>}
                {opt.label}
              </button>
            );
          }

          return (
            <button
              key={opt.id}
              disabled={isDisabled}
              onClick={() => handleClick(opt)}
              className={cn(
                "px-4 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200",
                isSelected
                  ? "bg-coral text-white border-coral"
                  : "bg-surface border-border-strong text-text-secondary hover:border-coral hover:text-coral",
                isDisabled && !isSelected && "opacity-40"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// --- Typing Indicator ---
export const TypingIndicator = () => (
  <div className="flex gap-1.5 bg-surface border border-border-subtle p-3 rounded-[4px_16px_16px_16px] w-fit shadow-sm animate-msg-in">
    {[0, 1, 2].map(i => (
      <span 
        key={i}
        className="w-1.5 h-1.5 bg-text-muted rounded-full dot-bounce" 
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
  </div>
);

// --- Chat Input ---
interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  quickActions?: { icon?: ReactNode; label: string; text?: string }[];
  imageAttachment?: { data: string, mimeType: string, extractedText?: string } | null;
  setImageAttachment: (img: { data: string, mimeType: string, extractedText?: string } | null) => void;
  initialValue?: string;
}

export const ChatInput = ({ onSend, isLoading, placeholder, quickActions = [], imageAttachment, setImageAttachment, initialValue = "" }: ChatInputProps) => {
  const [value, setValue] = useState(initialValue);
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialValue) setValue(initialValue);
  }, [initialValue]);

  const handleSend = () => {
    if (!value.trim() && !imageAttachment) return;
    if (isLoading || isProcessing) return;
    onSend(value);
    setValue("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    try {
        const extractedText = await extractTextFromFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(",")[1];
            setImageAttachment({ 
                data: base64, 
                mimeType: file.type,
                extractedText: extractedText || undefined
            });
        };
        reader.readAsDataURL(file);
    } catch (err) {
        console.error("File processing failed:", err);
    } finally {
        setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [value]);

  return (
    <div className="flex flex-col gap-3 max-w-3xl mx-auto w-full">
      {quickActions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {quickActions.map((qa, i) => (
            <button
              key={i}
              onClick={() => onSend(qa.text || qa.label)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border-subtle rounded-full text-xs font-medium text-text-secondary hover:border-coral hover:text-coral hover:bg-coral/5 whitespace-nowrap transition-colors"
            >
              {qa.icon && <span className="text-sm">{qa.icon}</span>}
              {qa.label}
            </button>
          ))}
        </div>
      )}

      <div className={cn(
        "relative flex flex-col p-2 bg-surface border border-border-strong rounded-2xl shadow-sm transition-shadow focus-within:shadow-md",
        isLoading && "opacity-80"
      )}>
        {imageAttachment && (
            <div className="px-4 py-2 flex items-center gap-3">
                <div className="relative group/img">
                    {imageAttachment.mimeType.startsWith("image/") ? (
                        <img src={`data:${imageAttachment.mimeType};base64,${imageAttachment.data}`} className="h-16 w-16 object-cover rounded-xl border border-border-strong" />
                    ) : (
                        <div className="h-16 w-16 bg-sidebar rounded-xl border border-border-strong flex items-center justify-center text-indigo-600">
                            <Paperclip size={24} />
                        </div>
                    )}
                    <button 
                        onClick={() => setImageAttachment(null)}
                        className="absolute -top-2 -right-2 bg-text-primary text-white p-1 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                    >
                        <X size={12} />
                    </button>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-coral uppercase tracking-widest">
                        {imageAttachment.extractedText ? "Local Extraction Complete" : "Attachment Loaded"}
                    </span>
                    <span className="text-xs text-text-secondary">
                        {imageAttachment.mimeType.split("/")[1].toUpperCase()} • {imageAttachment.extractedText ? `${imageAttachment.extractedText.length} chars extracted` : "Ready for AI"}
                    </span>
                </div>
            </div>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={placeholder || "Ask anything..."}
          rows={1}
          className="w-full bg-transparent border-none focus:ring-0 text-text-primary placeholder:text-text-muted text-[14.5px] leading-relaxed resize-none py-2 px-4 max-h-[150px] outline-none"
        />
        <div className="flex items-center justify-between px-2 pt-1 border-t border-border-subtle/50 mt-1">
          <div className="flex gap-1">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,.pdf,.txt,.md" 
                onChange={handleFileChange}
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="p-2 text-text-muted hover:text-coral transition-colors rounded-lg hover:bg-coral/5" 
                title="Attach file (PDF, Image, Text)"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
            </button>
            <button className="p-2 text-text-muted hover:text-coral transition-colors rounded-lg hover:bg-coral/5" title="Add YouTube video">
              <Youtube size={18} />
            </button>
            <button className="p-2 text-text-muted hover:text-coral transition-colors rounded-lg hover:bg-coral/5" title="Memory Context">
              <BrainCircuit size={18} />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={!value.trim() || isLoading}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200",
              value.trim() && !isLoading 
                ? "bg-coral text-white shadow-lg shadow-coral/20 hover:bg-coral-hover scale-100" 
                : "bg-border-strong text-text-muted scale-95 cursor-not-allowed"
            )}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Enhanced Chat Bubble ---
interface ChatBubbleProps {
  role?: "assistant" | "user" | "model" | "system";
  children: ReactNode;
  avatar?: ReactNode;
  className?: string;
  textToSpeak?: string;
  source?: "notes" | "extra";
}

export const ChatBubble = ({ role = "assistant", children, avatar, className, textToSpeak, source }: ChatBubbleProps) => {
  const isUser = role === "user";
  const isSystem = role === "system";
  const isModel = role === "model" || role === "assistant";
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = () => {
    if (!window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const text = textToSpeak || (typeof children === 'string' ? children : '');
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-6">
        <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted bg-sidebar/50 px-4 py-1.5 rounded-full border border-border-subtle">
          {children}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-4 items-start max-w-3xl w-full group animate-msg-in",
      isUser ? "flex-row-reverse ml-auto" : "flex-row mr-auto",
      className
    )}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold shadow-sm border",
        isUser ? "bg-sidebar border-border-strong text-text-secondary" : "bg-coral border-coral/10 text-white"
      )}>
        {avatar || (isUser ? "U" : "AI")}
      </div>

      {/* Bubble Container */}
      <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
        {source && <SourceTag type={source} />}
        
        <div className="relative">
          <div className={cn(
            "p-4 text-[14.5px] leading-relaxed shadow-sm group-hover:shadow-md transition-shadow relative",
            isUser 
              ? "bg-sidebar text-text-primary rounded-[16px_4px_16px_16px]" 
              : "bg-surface border border-border-subtle text-text-primary rounded-[4px_16px_16px_16px]"
          )}>
            <div className="markdown-body">
              {children}
            </div>
          </div>

          {isModel && (textToSpeak || typeof children === 'string') && (
            <button 
              onClick={handleSpeak}
              className={cn(
                "absolute -right-10 top-2 p-2 rounded-full bg-white border border-border-subtle text-text-muted hover:text-coral transition-colors opacity-0 group-hover:opacity-100 shadow-sm",
                isSpeaking && "opacity-100 text-coral bg-coral/5"
              )}
              title="Read aloud"
            >
              {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
