// src/components/AllergenInput.tsx
// Single-value allergen combobox, same mechanism as ComplaintInput: the catalog lives in
// data/allergens.ts and the record still stores plain text.
//
// Free text is deliberately still allowed. findContraindications() resolves whatever is in the
// field back through the catalog, so a typed "Amoxicillin" finds the Penicillins class without
// being a catalog entry. The picker exists to make the common cases land on the canonical class
// name - not to restrict what can be recorded.
import { useEffect, useRef, useState } from 'react';
import { Search, X, AlertTriangle } from 'lucide-react';
import { resolveAllergenText, searchAllergens, type Allergen } from '../data/allergens';

interface AllergenInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function AllergenInput({
  value,
  onChange,
  placeholder = 'Search allergens, or type the substance',
  disabled = false,
}: AllergenInputProps) {
  const [suggestions, setSuggestions] = useState<Allergen[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasFocused, setHasFocused] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const term = value;
  const resolved = resolveAllergenText(term);

  useEffect(() => {
    if (!hasFocused) return;
    setSuggestions(searchAllergens(term.trim(), 8));
    setSelectedIndex(-1);
  }, [term, hasFocused]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setHasFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const select = (allergen: Allergen) => {
    onChange(allergen.name);
    setShowDropdown(false);
    setHasFocused(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowDropdown(true);
      setHasFocused(true);
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && showDropdown) {
      e.preventDefault();
      select(suggestions[selectedIndex]);
    } else if (e.key === 'Enter' && showDropdown) {
      // Keep Enter on a half-typed term from bubbling to the form's submit handler: this field
      // lives on the registration page, where Enter would otherwise create a patient record.
      e.preventDefault();
      setShowDropdown(false);
      setHasFocused(false);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setHasFocused(false);
    }
  };

  // What the hard block will do with this text, stated in the same words the prescriber will see.
  const hint = (() => {
    const trimmed = term.trim();
    if (!trimmed) return null;
    if (resolved.length > 0) {
      const names = [...new Set(resolved.map((a) => a.name))];
      return { tone: 'ok' as const, text: `Prescribing will be blocked for: ${names.join(', ')}.` };
    }
    if (trimmed.length < 3) return null;
    return {
      tone: 'warn' as const,
      text: 'Not in the catalog - prescribing is only blocked when a drug name matches this text.',
    };
  })();

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        <input
          ref={inputRef}
          type="text"
          value={term}
          onChange={(e) => {
            onChange(e.target.value);
            setHasFocused(true);
            setShowDropdown(true);
          }}
          onFocus={() => {
            setHasFocused(true);
            setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          aria-label="Allergen"
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-8 pr-8 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-1 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
        {term && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-tertiary)]"
            aria-label="Clear allergen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {hint && (
        <p
          className={`mt-1 text-[11px] leading-tight ${
            hint.tone === 'ok' ? 'text-[var(--text-tertiary)]' : 'flex items-start gap-1 text-amber-600 dark:text-amber-400'
          }`}
        >
          {hint.tone === 'warn' && <AlertTriangle className="w-3 h-3 mt-px shrink-0" />}
          {hint.text}
        </p>
      )}

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-56 overflow-y-auto z-50">
          {!term.trim() && (
            <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Common allergens</p>
          )}
          {suggestions.map((allergen, idx) => (
            <button
              key={allergen.id}
              type="button"
              onClick={() => select(allergen)}
              className={`w-full px-3 py-1.5 text-left hover:bg-[var(--bg-main)] transition-colors ${
                idx === selectedIndex ? 'bg-[var(--bg-main)]' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-primary)]">{allergen.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-main)] text-[var(--text-tertiary)] whitespace-nowrap">
                  {allergen.group}
                </span>
              </span>
              {allergen.note && <span className="block text-[10px] text-[var(--text-tertiary)] mt-0.5">{allergen.note}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
