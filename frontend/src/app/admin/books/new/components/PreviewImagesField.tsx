"use client";

import { Plus, X, Image as ImageIcon, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { uploadImage } from "@/lib/api/upload";

interface PreviewImagesFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export function PreviewImagesField({ images, onChange }: PreviewImagesFieldProps) {
  const [newValue, setNewValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();

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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);

    const token = session?.accessToken;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadImage(file, token);
      if (result.success && result.data) {
        if (!images.includes(result.data.url)) {
          onChange([...images, result.data.url]);
        }
      } else {
        setUploadError(result.message || `Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

      {uploadError && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-red-400" />
          {uploadError}
        </p>
      )}

      {/* File upload input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* Add new image — URL input OR file upload */}
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="url"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addImage(); } }}
            placeholder="Paste image URL or upload from computer..."
            className="w-full px-4 py-2 h-10 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-500"
          />
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 h-10 shrink-0 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload
            </>
          )}
        </button>
        <button
          type="button"
          onClick={addImage}
          disabled={!newValue.trim()}
          className="px-4 py-2 h-10 shrink-0 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add URL
        </button>
      </div>
    </div>
  );
}
