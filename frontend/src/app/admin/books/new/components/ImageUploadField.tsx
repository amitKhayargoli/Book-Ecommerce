"use client";

import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import { useSession } from "@/lib/session-context";
import { uploadImage } from "@/lib/api/upload";

interface ImageUploadFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Label for the upload button, e.g. "Upload Cover" */
  uploadLabel?: string;
}

export function ImageUploadField({
  value,
  onChange,
  placeholder = "https://example.com/image.jpg",
  uploadLabel = "Upload",
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);

    const file = files[0];
    const token = session?.accessToken;
    const result = await uploadImage(file, token);

    if (result.success && result.data) {
      onChange(result.data.url);
    } else {
      setUploadError(result.message || "Upload failed");
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className="space-y-3">
      {/* File input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml"
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* Current image preview */}
      {value ? (
        <div className="relative w-28 h-40 rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] group">
          <img
            src={value}
            alt="Uploaded preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="w-28 h-40 rounded-xl border border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-2 text-white/20">
          <ImageIcon className="w-8 h-8" />
          <span className="text-[10px] font-medium uppercase tracking-wider">No image</span>
        </div>
      )}

      {/* URL input + Upload button */}
      <div className="flex gap-3 items-center">
        <div className="flex-1">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
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
              {uploadLabel}
            </>
          )}
        </button>
      </div>

      {uploadError && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-red-400" />
          {uploadError}
        </p>
      )}
    </div>
  );
}
