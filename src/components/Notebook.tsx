import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from "./ui/Button";
import { Heading } from "./ui/Typography";
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo, 
  Save, 
  Sparkles,
  ChevronLeft,
  Type,
  FileText,
  Plus,
  Trash2
} from "lucide-react";
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { Card } from './ui/Card';
import { callGemini } from '../lib/gemini';

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-white border-b border-border-subtle sticky top-0 z-10">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={cn("p-2 rounded-lg transition-colors", editor.isActive('bold') ? 'bg-coral/10 text-coral' : 'hover:bg-sidebar')}
      >
        <Bold size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={cn("p-2 rounded-lg transition-colors", editor.isActive('italic') ? 'bg-coral/10 text-coral' : 'hover:bg-sidebar')}
      >
        <Italic size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={cn("p-2 rounded-lg transition-colors", editor.isActive('heading', { level: 1 }) ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-sidebar')}
      >
        <Heading level={4} className="text-sm font-bold">H1</Heading>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn("p-2 rounded-lg transition-colors", editor.isActive('heading', { level: 2 }) ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-sidebar')}
      >
        <Heading level={4} className="text-sm font-bold">H2</Heading>
      </button>
      <div className="w-px h-6 bg-border-subtle mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn("p-2 rounded-lg transition-colors", editor.isActive('bulletList') ? 'bg-coral/10 text-coral' : 'hover:bg-sidebar')}
      >
        <List size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn("p-2 rounded-lg transition-colors", editor.isActive('orderedList') ? 'bg-coral/10 text-coral' : 'hover:bg-sidebar')}
      >
        <ListOrdered size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn("p-2 rounded-lg transition-colors", editor.isActive('blockquote') ? 'bg-coral/10 text-coral' : 'hover:bg-sidebar')}
      >
        <Quote size={18} />
      </button>
      <div className="w-px h-6 bg-border-subtle mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-2 rounded-lg hover:bg-sidebar transition-colors"
      >
        <Undo size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-2 rounded-lg hover:bg-sidebar transition-colors"
      >
        <Redo size={18} />
      </button>
    </div>
  );
};

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export const Notebook = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('notebook_notes');
    if (saved) return JSON.parse(saved);
    return [{
        id: '1',
        title: 'Initial Synthesis',
        content: '<h1>Research Synthesis</h1><p>Start organizing your knowledge nodes...</p>',
        updatedAt: Date.now()
    }];
  });

  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || '1');
  const [isSaving, setIsSaving] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);

  useEffect(() => {
    localStorage.setItem('notebook_notes', JSON.stringify(notes));
  }, [notes]);

  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Synthesize your findings here...',
      }),
    ],
    content: activeNote.content,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px] p-12 text-lg',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      updateNote(activeNoteId, { content: html });
    },
  });

  // Critical: sync editor when switching notes
  useEffect(() => {
    if (editor && activeNote && editor.getHTML() !== activeNote.content) {
      editor.commands.setContent(activeNote.content);
    }
  }, [activeNoteId, editor]);

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n));
  };

  const createNewNote = () => {
    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Synthesis',
      content: '<h1>New Note</h1><p>Organize your thoughts...</p>',
      updatedAt: Date.now()
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const deleteNote = (id: string) => {
    if (notes.length <= 1) return;
    const nextNotes = notes.filter(n => n.id !== id);
    setNotes(nextNotes);
    if (activeNoteId === id) setActiveNoteId(nextNotes[0].id);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const polishText = async () => {
    if (!editor || isPolishing) return;
    setIsPolishing(true);
    try {
      const text = editor.getText();
      const prompt = `You are an expert technical editor. Polish and improve the structure of the following notes while maintaining accuracy and the student's original intent. Return ONLY the improved version as HTML.
      
      NOTES:
      ${text}`;

      const response = await callGemini({
        model: localStorage.getItem("preferred_llm") || "gemini-1.5-flash-latest",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      if (response.text) {
        let cleaned = response.text;
        if (cleaned.includes('```html')) {
            cleaned = cleaned.split('```html')[1].split('```')[0];
        } else if (cleaned.includes('```')) {
             cleaned = cleaned.split('```')[1].split('```')[0];
        }
        editor.commands.setContent(cleaned);
      }
    } catch (e) {
      console.error(e);
      alert("AI Polishing failed.");
    } finally {
      setIsPolishing(false);
    }
  };

  return (
    <div className="flex h-full bg-white animate-in fade-in duration-700 overflow-hidden">
      {/* Note Sidebar */}
      <div className="w-80 border-r border-border-subtle bg-sidebar/10 flex flex-col pt-20">
         <div className="p-8 pb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Synthesis Library</h3>
            <button 
              onClick={createNewNote}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <Plus size={18} />
            </button>
         </div>
         
         <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-2 no-scrollbar">
            {notes.map(note => (
              <div 
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={cn(
                  "group p-4 rounded-2xl cursor-pointer transition-all border flex justify-between items-start gap-4",
                  activeNoteId === note.id 
                    ? "bg-white border-coral shadow-sm" 
                    : "border-transparent hover:bg-white/50"
                )}
              >
                <div className="flex flex-col gap-1 min-w-0">
                   <input 
                      className={cn(
                        "text-sm font-bold bg-transparent border-none outline-none focus:ring-0 p-0 truncate w-full",
                        activeNoteId === note.id ? "text-text-primary" : "text-text-secondary"
                      )}
                      value={note.title}
                      onChange={(e) => updateNote(note.id, { title: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                   />
                   <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
         </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-border-subtle px-10 h-24 flex items-center justify-between shrink-0 pt-4">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" onClick={() => setActiveTab("dashboard")} className="hover:bg-sidebar rounded-xl">
              <ChevronLeft size={20} className="mr-1" /> Back
            </Button>
            <div className="h-8 w-px bg-border-subtle" />
            <div className="flex flex-col">
              <h2 className="text-xl font-serif text-text-primary">{activeNote.title}</h2>
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-coral" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Cognitive Synthesis Node</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="secondary" 
              size="sm" 
              className="rounded-xl px-6"
              icon={<Sparkles size={16} className={cn(isPolishing && "animate-pulse")} />}
              onClick={polishText}
              disabled={isPolishing}
            >
              {isPolishing ? "AI Polishing..." : "AI Refine"}
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              className="rounded-xl px-6"
              icon={isSaving ? <Check size={16} /> : <Save size={16} />}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saved" : "Save Changes"}
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full flex flex-col no-scrollbar">
          <MenuBar editor={editor} />
          <div className="flex-1 flex justify-center bg-sidebar/5 ">
            <div className="w-full max-w-5xl bg-white min-h-[1000px] shadow-2xl border-x border-border-subtle">
               <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Check = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
