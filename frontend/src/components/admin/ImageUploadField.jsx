import React, { useState, useRef, useEffect } from 'react';
import FoodImage from '../common/FoodImage.jsx';
import menuApi from '../../services/menuApi.js';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * ImageUploadField Component
 *
 * Professional direct image upload widget for Admin Menu Management (Add & Edit).
 * Features:
 * - Direct file selection & drag-and-drop
 * - Client-side validation: format (JPG, PNG, WEBP) & max size (5 MB)
 * - Immediate image preview maintaining aspect ratio with object-cover and rounded corners
 * - Seamless integration with existing backend menu image storage
 * - Replace and remove image actions
 * - Fallback mode for manual image file path entry
 */
export default function ImageUploadField({
  value = '',
  onChange,
  disabled = false,
  label = 'Menu Item Dish Image',
  dishName = '',
}) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [localPreview, setLocalPreview] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);

  // Clear transient notifications after a timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Clean up object URL on unmount or replace
  useEffect(() => {
    return () => {
      if (localPreview && localPreview.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  // Validate file client-side before uploading
  const validateFile = (file) => {
    if (!file) return 'Please select a file.';

    const fileName = (file.name || '').toLowerCase();
    const ext = fileName.substring(fileName.lastIndexOf('.'));
    const mimeType = (file.type || '').toLowerCase();

    // Specific explicit format errors
    if (ext === '.svg' || mimeType === 'image/svg+xml') {
      return 'SVG format is not allowed for security reasons. Please upload a JPG, PNG, or WEBP image.';
    }

    if (ext === '.gif' || mimeType === 'image/gif') {
      return 'GIF format is not supported. Please upload a JPG, PNG, or WEBP image.';
    }

    if (
      ext === '.exe' ||
      ext === '.js' ||
      ext === '.html' ||
      ext === '.htm' ||
      ext === '.php' ||
      ext === '.sh' ||
      ext === '.bat'
    ) {
      return 'Executable and script files are strictly prohibited.';
    }

    const isValidExt = ALLOWED_EXTENSIONS.some((allowed) => ext.endsWith(allowed));
    const isValidMime = ALLOWED_MIME_TYPES.includes(mimeType);

    if (!isValidExt && !isValidMime) {
      return 'Invalid file format. Only JPG, JPEG, PNG, and WEBP images are supported.';
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `File size (${sizeMB} MB) exceeds the 5 MB limit. Please select an image under 5 MB.`;
    }

    return null;
  };

  // Perform upload
  const handleUploadFile = async (file) => {
    if (!file || disabled) return;

    setErrorMessage('');
    setSuccessMessage('');

    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    // Generate instant preview
    const previewBlobUrl = URL.createObjectURL(file);
    setLocalPreview(previewBlobUrl);
    setSelectedFileName(file.name);
    setUploading(true);

    try {
      const result = await menuApi.uploadMenuImage(file);

      if (result && result.success && result.imagePath) {
        onChange(result.imagePath);
        setSuccessMessage('Image uploaded successfully.');
        setSelectedFileName(result.filename || file.name);
      } else {
        setErrorMessage(result?.error || 'Upload failed. Please try again.');
        // Revert local preview if upload failed
        setLocalPreview(null);
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Network error occurred during image upload.');
      setLocalPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleRemoveImage = () => {
    if (localPreview && localPreview.startsWith('blob:')) {
      URL.revokeObjectURL(localPreview);
    }
    setLocalPreview(null);
    setSelectedFileName('');
    setErrorMessage('');
    setSuccessMessage('');
    onChange('');
  };

  const handleTriggerBrowse = () => {
    if (fileInputRef.current && !disabled && !uploading) {
      fileInputRef.current.click();
    }
  };

  // Active display image (local preview takes priority over saved value)
  const currentDisplayImage = localPreview || value;
  const hasImage = Boolean(currentDisplayImage && currentDisplayImage.trim() !== '');

  return (
    <div className="space-y-2">
      {/* Label and Mode Switcher */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-primary block">
          {label} <span className="text-slate-400 font-normal">(Optional)</span>
        </label>
        <button
          type="button"
          onClick={() => {
            setIsManualMode((prev) => !prev);
            setErrorMessage('');
          }}
          className="text-[11px] font-semibold text-accent hover:underline cursor-pointer"
        >
          {isManualMode ? 'Switch to Image Upload' : 'Enter File Path Manually'}
        </button>
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="hidden"
        aria-label="Upload menu dish image"
      />

      {/* Mode A: Manual File Path Entry (Fallback) */}
      {isManualMode ? (
        <div className="space-y-1.5">
          <input
            type="text"
            name="image"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || uploading}
            placeholder="/images/menu/paneer_tikka_masala.jpg"
            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-accent focus:outline-hidden transition font-mono"
          />
          <p className="text-[10px] text-muted">
            Existing image path reference from <code>public/images/menu/</code>.
          </p>
        </div>
      ) : (
        /* Mode B: Direct Image Upload & Drag-and-Drop Area */
        <div className="space-y-3">
          {hasImage ? (
            /* Current / Preview Image Display Card */
            <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              {/* Image Preview Thumbnail */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs relative">
                {localPreview ? (
                  <img
                    src={localPreview}
                    alt={dishName || 'Uploaded dish preview'}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <FoodImage
                    src={value}
                    alt={dishName || 'Current dish image'}
                    className="w-full h-full"
                    objectFit="cover"
                  />
                )}
                <span className="absolute bottom-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-white backdrop-blur-xs">
                  {localPreview ? 'Preview' : 'Current'}
                </span>
              </div>

              {/* Image Metadata & Controls */}
              <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-start">
                  <span className="text-[11px] font-bold text-primary truncate max-w-[200px]">
                    {selectedFileName || (value ? value.split('/').pop() : 'Dish Image')}
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Ready
                  </span>
                </div>

                <p className="text-[10px] text-muted font-mono truncate">
                  Path: {value || 'Pending save...'}
                </p>

                {/* Action Buttons */}
                <div className="pt-1 flex items-center gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={handleTriggerBrowse}
                    disabled={disabled || uploading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-accent hover:text-accent text-[11px] font-bold text-primary transition shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Replace Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={disabled || uploading}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-[11px] font-bold text-red-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Upload Dropzone Container */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleTriggerBrowse}
              className={`border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-2.5 ${
                dragActive
                  ? 'border-accent bg-accent/5'
                  : 'border-slate-200 hover:border-accent hover:bg-slate-50/80 bg-slate-50/40'
              } ${disabled || uploading ? 'opacity-60 pointer-events-none' : ''}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTriggerBrowse();
                }
              }}
              aria-label="Upload menu item image drag and drop area"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center shadow-2xs">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>

              <div>
                <span className="text-xs font-bold text-primary block">
                  Choose Image or Drag & Drop
                </span>
                <span className="text-[10px] text-muted block mt-0.5">
                  JPG, JPEG, PNG, or WEBP up to 5 MB
                </span>
              </div>

              <button
                type="button"
                className="px-3.5 py-1.5 text-[11px] font-bold rounded-lg bg-white border border-slate-200 hover:border-accent text-primary transition shadow-2xs"
              >
                Browse Files
              </button>
            </div>
          )}

          {/* Uploading Status Indicator */}
          {uploading && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold animate-pulse">
              <svg className="animate-spin h-4 w-4 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Uploading image...</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="text-red-500 hover:text-red-700 text-xs font-bold"
                aria-label="Dismiss error"
              >
                &times;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
