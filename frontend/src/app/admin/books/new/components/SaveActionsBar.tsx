import { Save, RotateCcw, XCircle, ArrowLeft, CheckCircle } from "lucide-react";

interface SaveActionsBarProps {
  onSave: () => void;
  onClear: () => void;
  onResetImport: () => void;
  hasImportedData: boolean;
  isSaving?: boolean;
  currentStep?: number;
  onPrevStep?: () => void;
  isReviewStep?: boolean;
}

export function SaveActionsBar({
  onSave,
  onClear,
  onResetImport,
  hasImportedData,
  isSaving = false,
  currentStep,
  onPrevStep,
  isReviewStep = false,
}: SaveActionsBarProps) {
  // If not on review step, this is rendered inline with the Continue button
  if (!isReviewStep) return null;

  return (
    <div className="flex items-center justify-between w-full gap-4">
      <div className="flex items-center gap-3">
        {onPrevStep && (
          <button
            type="button"
            onClick={onPrevStep}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Edit
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-widest"
        >
          <XCircle className="w-4 h-4" />
          Clear Form
        </button>
        {hasImportedData && (
          <button
            type="button"
            onClick={onResetImport}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-drama/60 hover:text-drama hover:bg-drama/5 rounded-xl transition-all uppercase tracking-widest"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Data
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-3 px-8 py-3.5 text-sm font-black text-black bg-white hover:bg-white/90 rounded-2xl transition-all shadow-xl shadow-white/5 active:scale-95 uppercase tracking-tighter"
        >
          <CheckCircle className="w-4 h-4" />
          {isSaving ? "Saving..." : "Publish Book"}
        </button>
      </div>
    </div>
  );
}
