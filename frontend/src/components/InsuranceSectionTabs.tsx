// Shared section tab bar for the Insurance area: Claims | Providers | Corporate
import { useNavigate } from 'react-router-dom';
import { FileText, Shield, Briefcase } from 'lucide-react';

export type InsuranceSection = 'claims' | 'providers' | 'corporate';

const TABS: { key: InsuranceSection; label: string; icon: typeof FileText; path: string; activeClass: string }[] = [
  { key: 'claims', label: 'Claims', icon: FileText, path: '/dashboard/insurance-claims', activeClass: 'text-purple-600 border-b-2 border-purple-600' },
  { key: 'providers', label: 'Providers', icon: Shield, path: '/dashboard/insurance-providers', activeClass: 'text-blue-600 border-b-2 border-blue-600' },
  { key: 'corporate', label: 'Corporate', icon: Briefcase, path: '/dashboard/corporate-accounts', activeClass: 'text-cyan-600 border-b-2 border-cyan-600' },
];

export default function InsuranceSectionTabs({ active }: { active: InsuranceSection }) {
  const navigate = useNavigate();

  return (
    <div className="flex gap-1 border-b border-gray-200">
      {TABS.map(({ key, label, icon: Icon, path, activeClass }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            onClick={() => !isActive && navigate(path)}
            className={`px-5 py-3 text-sm font-medium transition-all relative flex items-center gap-2 ${
              isActive ? activeClass : 'text-gray-500 hover:text-gray-700'
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
