// src/components/ComplaintInput.tsx - FIXED (no nested buttons)
import { useState, useRef, useEffect } from 'react';
import { Search, Plus, X, Tag } from 'lucide-react';
import { COMPLAINTS_CATALOG, searchComplaints } from '../data/complaints';

interface ComplaintInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function ComplaintInput({
  value,
  onChange,
  placeholder = "Search complaints...",
  disabled = false,
  required = false
}: ComplaintInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Parse existing complaints into array
  const complaintsList = value
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Update suggestions
  useEffect(() => {
    if (searchTerm.trim()) {
      setSuggestions(searchComplaints(searchTerm, 8));
      setShowDropdown(true);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addComplaint = (complaint: string) => {
    if (complaintsList.includes(complaint)) return;
    
    const newValue = complaintsList.length === 0 
      ? complaint 
      : [...complaintsList, complaint].join(', ');
    
    onChange(newValue);
    setSearchTerm('');
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const removeComplaint = (complaintToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newList = complaintsList.filter(c => c !== complaintToRemove);
    onChange(newList.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      addComplaint(suggestions[selectedIndex]);
    } else if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      addComplaint(searchTerm.trim());
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Complaint Chips Row - using divs, not buttons */}
      {complaintsList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {complaintsList.map((complaint, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs"
            >
              <Tag className="w-2.5 h-2.5" />
              <span className="max-w-[150px] truncate">{complaint}</span>
              <button
                type="button"
                onClick={(e) => removeComplaint(complaint, e)}
                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.trim() && setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={complaintsList.length === 0 ? placeholder : "Add more..."}
            disabled={disabled}
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-1 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-[var(--text-primary)]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                addComplaint(searchTerm);
                setSearchTerm('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded hover:bg-[var(--icon-green-text)] hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addComplaint(suggestion)}
                className={`w-full px-3 py-1.5 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors ${
                  idx === selectedIndex ? 'bg-[var(--bg-main)]' : ''
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}