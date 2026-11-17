import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, FileCheck, Sparkles, AlertCircle } from 'lucide-react';

interface ImageDropzoneProps {
  label?: string;
  sublabel?: string;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  samplePath?: string;
  sampleLabel?: string;
  disabled?: boolean;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  label = "Upload Handwriting Sample",
  sublabel = "Drag and drop your image here, or browse. Accepts PNG, JPG, JPEG.",
  selectedFile,
  onFileSelect,
  samplePath,
  sampleLabel = "Load Academic Sample",
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview url when selectedFile changes
  React.useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const validateAndSetFile = (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (PNG, JPG, JPEG).');
      return;
    }
    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleLoadSample = async () => {
    if (!samplePath || disabled) return;
    try {
      setLoadingSample(true);
      const res = await fetch(samplePath);
      const blob = await res.blob();
      const filename = samplePath.split('/').pop() || 'sample.png';
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      onFileSelect(file);
    } catch (err) {
      console.error('Failed to load sample image', err);
    } finally {
      setLoadingSample(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 group ${
            isDragging
              ? 'border-brand-400 bg-brand-500/10 shadow-lg shadow-brand-500/10'
              : 'border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-900/90'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-brand-400 group-hover:scale-105 transition-transform duration-200 shadow-sm">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-slate-200">
            {label}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            {sublabel}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-600 transition-colors"
            >
              Select File
            </button>

            {samplePath && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSample();
                }}
                disabled={loadingSample}
                className="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-xs font-medium text-brand-300 border border-brand-500/30 flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                {loadingSample ? 'Loading...' : sampleLabel}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden group">
          <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300 truncate max-w-[80%]">
              <FileCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="font-mono truncate">{selectedFile.name}</span>
              <span className="text-slate-500 text-[11px]">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button
              onClick={handleRemove}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 flex items-center justify-center bg-slate-950/70 max-h-64 overflow-hidden">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Selected handwriting preview"
                className="max-h-56 max-w-full object-contain rounded-lg shadow-sm border border-slate-800"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
