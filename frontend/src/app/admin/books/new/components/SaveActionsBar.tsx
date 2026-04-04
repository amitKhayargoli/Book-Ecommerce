import { Save, RotateCcw, XCircle } from "lucide-react";

interface SaveActionsBarProps {
  onSave: () => void;
  onClear: () => void;
  onResetImport: () => void;
  hasImportedData: boolean;
  isSaving?: boolean;
}

export function SaveActionsBar({ onSave, onClear, onResetImport, hasImportedData, isSaving = false }: SaveActionsBarProps) {
  return (
    <div className="sticky bottom-8 z-20 flex items-center justify-between p-5 bg-[#0B0B0C]/60 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-2xl mt-12 w-full">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-widest cursor-none"
        >
          <XCircle className="w-4 h-4" />
          Clear Form
        </button>
        {hasImportedData && (
          <button
            type="button"
            onClick={onResetImport}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-drama/60 hover:text-drama hover:bg-drama/5 rounded-xl transition-all uppercase tracking-widest cursor-none"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Data
          </button>
        )}
      </div>
      
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-3 px-8 py-3.5 text-sm font-black text-black bg-white hover:bg-white/90 rounded-2xl transition-all shadow-xl shadow-white/5 active:scale-95 uppercase tracking-tighter cursor-none"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Create Book"}
        </button>
      </div>
  );
}
