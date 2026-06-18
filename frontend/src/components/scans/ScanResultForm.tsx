// src/components/scans/ScanResultForm.tsx
import React, { useState, useRef } from 'react';
import { X, Upload, Image, Trash2, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '../../store/toastStore';

interface ScanResultFormProps {
  scan: any;
  onSaveResult: (scanId: string, resultData: any) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

export const ScanResultForm: React.FC<ScanResultFormProps> = ({ 
  scan,
  onSaveResult,
  onClose,
  saving,
}) => {
  const [findings, setFindings] = useState(scan.findings || '');
  const [impression, setImpression] = useState(scan.impression || '');
  const [result, setResult] = useState(scan.result || '');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(scan.imageUrls || []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { error: toastError } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 10) {
      toastError('Too many images', 'Maximum 10 images allowed');
      return;
    }

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
    setImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setUploading(true);
    try {
      // Upload images first if any
      let uploadedImageUrls: string[] = [];
      
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach(image => {
          formData.append('images', image);
        });
        
        const response = await fetch(`/api/encounters/scans/${scan.id}/upload-images`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        const data = await response.json();
        if (response.ok && data.success) {
          uploadedImageUrls = data.data?.imageUrls || [];
        } else {
          toastError('Upload failed', data.message || 'Could not upload images');
          setUploading(false);
          return;
        }
      }

      // Combine existing images with newly uploaded ones
      const allImageUrls = [...(scan.imageUrls || []), ...uploadedImageUrls];

      await onSaveResult(scan.id, {
        findings,
        impression,
        result,
        imageUrls: allImageUrls,
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    } catch (error: any) {
      toastError('Save failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-color)]">
        <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Enter Scan Results</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-main)] rounded-lg">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          {/* Scan Info */}
          <div className="bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-color)]">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Scan Type: <span className="font-normal text-[var(--text-secondary)]">{scan.scanType || scan.ServiceCatalog?.name}</span>
            </p>
            <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
              Body Part: <span className="font-normal text-[var(--text-secondary)]">{scan.bodyPart || 'N/A'}</span>
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Requested by: {scan.requestedBy?.fullName || 'Unknown'} on {new Date(scan.requestedAt).toLocaleDateString()}
            </p>
          </div>
          
          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Upload Images
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border-color)] rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">
                Click or drag images to upload
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Supports JPG, PNG, GIF (max 10 images)
              </p>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Scan ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-[var(--border-color)]"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Findings */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Findings</label>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-[var(--text-primary)]"
              placeholder="Describe radiological findings..."
            />
          </div>
          
          {/* Impression */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Impression / Conclusion</label>
            <textarea
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-[var(--text-primary)]"
              placeholder="Clinical impression based on findings..."
            />
          </div>
          
          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Additional Notes</label>
            <textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-[var(--text-primary)]"
              placeholder="Any additional comments..."
            />
          </div>
          
          <div className="flex gap-3 pt-3 border-t border-[var(--border-color)]">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || uploading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
            >
              {saving || uploading ? 'Saving...' : 'Save Results'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};