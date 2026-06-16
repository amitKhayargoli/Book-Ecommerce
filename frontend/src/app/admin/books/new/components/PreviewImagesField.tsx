import { Plus, X, Image as ImageIcon } from "lucide-react";
import { useState } from "react";

interface PreviewImagesFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export function PreviewImagesField({ images, onChange }: PreviewImagesFieldProps) {
  const [newValue, setNewValue] = useState("");

  const addImage = () => {
    if (newValue.trim() && !images.includes(newValue.trim())) {
      onChange([...images, newValue.trim()]);
      setNewValue("");
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  const updateImage = (index: number, val: string) => {
    const newImages = [...images];
    newImages[index] = val;
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {images.map((url, index) => (
        <div key={index} className="flex gap-3 items-start group">
          <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-700 bg-slate-800/50 flex items-center justify-center">
            {url ? (
              <img 
                src={url} 
                alt={`Preview ${index + 1}`} 
                className="w-full h-full object-cover" 
                onError={(e) => { 
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style');
                }} 
              />
            ) : null}
            <ImageIcon className="w-6 h-6 text-slate-600 absolute" style={{ display: url ? 'none' : 'block' }} />
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => updateImage(index, e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1 px-4 py-2 h-10 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="p-2 h-10 w-10 shrink-0 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-700/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="url"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addImage(); } }}
            placeholder="Add new preview image URL..."
            className="w-full px-4 py-2 h-10 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-500"
          />
        </div>
        <button
          type="button"
          onClick={addImage}
          disabled={!newValue.trim()}
          className="px-4 py-2 h-10 shrink-0 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Image
        </button>
      </div>
    </div>
  );
}
