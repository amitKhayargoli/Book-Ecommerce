import { X, Plus } from "lucide-react";
import { useState, KeyboardEvent } from "react";

interface SubjectChipsProps {
  subjects: string[];
  onChange: (subjects: string[]) => void;
}

export function SubjectChips({ subjects, onChange }: SubjectChipsProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSubject();
    }
  };

  const addSubject = () => {
    const newSubject = inputValue.trim();
    if (newSubject && !subjects.includes(newSubject)) {
      onChange([...subjects, newSubject]);
      setInputValue("");
    }
  };

  const removeSubject = (subjectToRemove: string) => {
    onChange(subjects.filter(s => s !== subjectToRemove));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {subjects.map((subject) => (
          <span 
            key={subject}
            className="inline-flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-bold text-white uppercase tracking-wider shadow-sm transition-all hover:bg-white/10"
          >
            {subject}
            <button
              type="button"
              onClick={() => removeSubject(subject)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>
      
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type subject and press Enter"
          className="flex-1 px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all placeholder:text-white/20 font-medium cursor-none"
        />
        <button
          type="button"
          onClick={addSubject}
          disabled={!inputValue.trim()}
          className="p-3 sm:px-6 sm:py-3 bg-white/5 border border-white/5 rounded-2xl text-xs font-bold text-white uppercase tracking-widest hover:bg-white/10 hover:border-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center active:scale-95"
        >
          <span className="hidden sm:inline">Add Tag</span>
          <Plus className="w-4 h-4 sm:hidden" />
        </button>
      </div>
    </div>
  );
}
