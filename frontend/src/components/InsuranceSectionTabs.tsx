// Shared section tab bar for the Insurance area: Claims | Providers | Corporate
import { useNavigate } from 'react-router-dom';
import { FileText, Shield, Briefcase, Activity } from 'lucide-react';

export type InsuranceSection = 'claims' | 'tracking' | 'providers' | 'corporate';

const TABS: { key: InsuranceSection; label: string; icon: typeof FileText; path: string; activeClass: string }[] = [
  { key: 'claims', label: 'Claims', icon: FileText, path: '/dashboard/insurance-claims', activeClass: 'text-[var(--icon-purple-text)] border-b-2 border-[var(--icon-purple-text)]' },
  { key: 'tracking', label: 'Tracking & Payments', icon: Activity, path: '/dashboard/insurance-claims/tracking', activeClass: 'text-[var(--icon-green-text)] border-b-2 border-[var(--icon-green-text)]' },
  { key: 'providers', label: 'Providers', icon: Shield, path: '/dashboard/insurance-providers', activeClass: 'text-[var(--icon-cyan-text)] border-b-2 border-[var(--icon-cyan-text)]' },
  { key: 'corporate', label: 'Corporate', icon: Briefcase, path: '/dashboard/corporate-accounts', activeClass: 'text-[var(--icon-cyan-text)] border-b-2 border-[var(--icon-cyan-text)]' },
];

export default function InsuranceSectionTabs({ active }: { active: InsuranceSection }) {
  const navigate = useNavigate();

  return (
    <div className="flex gap-1 border-b border-[var(--border-color)]">
      {TABS.map(({ key, label, icon: Icon, path, activeClass }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            onClick={() => !isActive && navigate(path)}
            className={`px-5 py-3 text-sm font-medium transition-all relative flex items-center gap-2 ${
              isActive ? activeClass : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
