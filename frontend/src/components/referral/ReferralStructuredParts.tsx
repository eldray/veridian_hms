// src/components/referral/ReferralStructuredParts.tsx
// Renders the Part I / Part II sections from the shared field specs in referralForm.ts, so
// the entry panels and the detail view cannot drift apart from what the server stores.
// Colours: var(--*) tokens only — no hard-coded Tailwind palette colours.
import { Field, INPUT, SELECT } from '../ui';
import type { FieldSection } from './referralForm';

type Values = Record<string, string>;

interface PartProps {
  sections: FieldSection[];
  values: Values;
  onChange: (key: string, value: string) => void;
  /** 'cyan' for Part I (sending side), 'green' for Part II (receiving side). */
  tone?: 'cyan' | 'green';
}

const TONE = {
  cyan: {
    shell: 'border-[var(--border-color)] bg-[var(--icon-cyan-bg)]/40',
    section: 'text-[var(--icon-cyan-text)]',
  },
  green: {
    shell: 'border-[var(--border-color)] bg-[var(--icon-green-bg)]/40',
    section: 'text-[var(--icon-green-text)]',
  },
} as const;

export function ReferralPartFields({ sections, values, onChange, tone = 'cyan' }: PartProps) {
  const palette = TONE[tone];
  return (
    <div className={`rounded-xl border ${palette.shell} p-4 space-y-4`}>
      {sections.map((section, index) => (
        <section key={section.title} className={index > 0 ? 'pt-3 border-t border-[var(--border-color)]' : ''}>
          <h5 className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${palette.section}`}>
            {section.title}
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.fields.map(field => (
              <Field
                key={field.key}
                label={field.label}
                required={field.required}
                hint={field.hint}
                className={field.wide ? 'sm:col-span-2' : ''}
              >
                {field.input === 'textarea' ? (
                  <textarea
                    rows={field.rows ?? 2}
                    value={values[field.key] ?? ''}
                    onChange={e => onChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={`${INPUT} w-full resize-none`}
                  />
                ) : field.input === 'select' ? (
                  <select
                    value={values[field.key] ?? ''}
                    onChange={e => onChange(field.key, e.target.value)}
                    className={`${SELECT} w-full`}
                  >
                    {field.options?.map(option => (
                      <option key={option} value={option}>
                        {option || '— select —'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.input === 'date' ? 'date' : 'text'}
                    value={values[field.key] ?? ''}
                    onChange={e => onChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={`${INPUT} w-full`}
                  />
                )}
              </Field>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

interface ReadOnlyProps {
  sections: FieldSection[];
  values: Values;
  /** Detail view: hide blank answers so the sheet stays scannable. Print view: show them. */
  hideEmpty?: boolean;
}

/** Every stored answer, including the blank ones, so a missing field reads as missing. */
export function ReferralPartReadOnly({ sections, values, hideEmpty = false }: ReadOnlyProps) {
  return (
    <div className="space-y-4">
      {sections.map(section => {
        const visible = section.fields.filter(f => !hideEmpty || (values[f.key] ?? '').trim() !== '');
        if (!visible.length) return null;
        return (
          <div key={section.title}>
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              {section.title}
            </h5>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
              {visible.map(field => {
                const raw = (values[field.key] ?? '').trim();
                return (
                  <div key={field.key} className={field.wide ? 'sm:col-span-2' : ''}>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                      {field.label}
                    </dt>
                    <dd className={`text-sm mt-0.5 ${raw ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] italic'}`}>
                      <span className={field.input === 'textarea' ? 'whitespace-pre-wrap' : ''}>
                        {raw || 'Not recorded'}
                      </span>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
