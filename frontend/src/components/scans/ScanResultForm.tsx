// src/components/scans/ScanResultForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Image, Trash2, Eye, AlertCircle, CheckCircle, Plus, Minus } from 'lucide-react';
import { useToast } from '../../store/toastStore';
import { useScanTemplateStore } from '../../store/scanTemplateStore';

interface ScanResultFormProps {
  scan: any;
  onSaveResult: (scanId: string, resultData: any) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

interface TemplateSection {
  id: string;
  title: string;
  normalComment: string;
  findings: string;
}

interface CustomSection extends TemplateSection {
  isCustom?: boolean;
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
  const { getScanTemplate, currentScanTemplate, isLoading: templateLoading } = useScanTemplateStore();
  
  // Layered sections state - combines template and custom sections
  const [sections, setSections] = useState<CustomSection[]>([]);
  const [useLayeredView, setUseLayeredView] = useState(true);

  // Load template when component mounts
  useEffect(() => {
    if (scan?.ServiceCatalog?.id || scan?.scanType) {
      const templateId = scan.ServiceCatalog?.id || scan.scanType;
      getScanTemplate(templateId).catch(() => {
        // Template not found, will use basic view
      });
    }
  }, [scan]);

  // Initialize sections from template
  useEffect(() => {
    if (currentScanTemplate?.reportTemplate && Array.isArray(currentScanTemplate.reportTemplate)) {
      const templateSections: CustomSection[] = currentScanTemplate.reportTemplate.map((section: any, index: number) => ({
        id: section.id || `template-${index}`,
        title: section.title || section.name || `Section ${index + 1}`,
        normalComment: section.normalComment || section.defaultFinding || '',
        findings: section.findings || '',
        isCustom: false
      }));
      setSections(templateSections);
      setUseLayeredView(templateSections.length > 0);
    } else {
      setSections([]);
      setUseLayeredView(false);
    }
  }, [currentScanTemplate]);

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

  const updateSectionFindings = (sectionId: string, findings: string) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, findings } : s
    ));
  };

  const addCustomSection = () => {
    const newSection: CustomSection = {
      id: `custom-${Date.now()}`,
      title: '',
      normalComment: '',
      findings: '',
      isCustom: true
    };
    setSections(prev => [...prev, newSection]);
  };

  const removeCustomSection = (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
  };

  const updateCustomSectionTitle = (sectionId: string, title: string) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, title } : s
    ));
  };

  const updateCustomSectionNormalComment = (sectionId: string, normalComment: string) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, normalComment } : s
    ));
  };

  const handleSubmit = async () => {
    setUploading(true);
    try {
      // Build structured findings from layered sections
      let structuredFindings: any = {};
      let plainTextFindings = '';

      if (useLayeredView) {
        // All sections are now in one array (template + custom combined)
        const allSections = sections;
        
        structuredFindings = {
          sections: allSections.map(s => ({
            title: s.title || 'Untitled Section',
            normalComment: s.normalComment,
            findings: s.findings,
            isCustom: s.isCustom || false
          })),
          impression: impression,
          additionalNotes: result
        };

        // Also create plain text version for backward compatibility
        plainTextFindings = allSections
          .filter(s => s.findings.trim() || s.normalComment)
          .map(s => {
            const title = s.title ? `${s.title}:\n` : '';
            const finding = s.findings.trim() ? s.findings : s.normalComment;
            return `${title}${finding}`;
          })
          .join('\n\n');
      } else {
        plainTextFindings = findings;
      }

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
        findings: useLayeredView ? plainTextFindings : findings,
        structuredFindings: useLayeredView ? structuredFindings : null,
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
      <div className="bg-[var(--bg-card)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-color)]">
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
          
          {/* Layered Template Sections or Basic View */}
          {useLayeredView && sections.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-[var(--text-primary)]">Findings by Region</h4>
                <button
                  onClick={() => setUseLayeredView(false)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Switch to Basic View
                </button>
              </div>

              {/* All Sections (Template + Custom) */}
              {sections.map((section, index) => (
                <div key={section.id} className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                  <div className={`px-4 py-2 border-b border-[var(--border-color)] flex items-center justify-between ${section.isCustom ? 'bg-purple-50' : 'bg-[var(--bg-main)]'}`}>
                    {section.isCustom ? (
                      <>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateCustomSectionTitle(section.id, e.target.value)}
                          placeholder="Section Title"
                          className="bg-transparent border-none text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-0 flex-1"
                        />
                        <button
                          onClick={() => removeCustomSection(section.id)}
                          className="ml-2 p-1 text-red-500 hover:bg-red-100 rounded"
                          title="Remove section"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <h5 className="font-semibold text-[var(--text-primary)]">{section.title}</h5>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    {section.normalComment && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-xs text-blue-700 font-medium">Normal Finding:</p>
                        <p className="text-sm text-blue-600 italic">{section.normalComment}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Your Findings (leave empty if normal)
                      </label>
                      <textarea
                        value={section.findings}
                        onChange={(e) => updateSectionFindings(section.id, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-[var(--text-primary)]"
                        placeholder="Describe any abnormal findings for this region..."
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Custom Section Button */}
              <button
                onClick={addCustomSection}
                className="w-full py-3 border-2 border-dashed border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Custom Section</span>
              </button>
            </div>
          ) : (
            /* Basic View (Fallback or User Choice) */
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-[var(--text-primary)]">Findings</label>
                {!useLayeredView && sections.length > 0 && (
                  <button
                    onClick={() => setUseLayeredView(true)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Switch to Layered View
                  </button>
                )}
              </div>
              <textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-[var(--text-primary)]"
                placeholder="Describe radiological findings..."
              />
            </div>
          )}
          
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