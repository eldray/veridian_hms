import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarClock, ClipboardList, Syringe } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const sections = [
  { path: '/dashboard/immunization', label: 'Vaccination Queue', icon: Syringe, match: (pathname: string) => pathname === '/dashboard/immunization' || pathname.startsWith('/dashboard/immunization/entries/') },
  { path: '/dashboard/immunization/due', label: 'Dose Follow-up', icon: CalendarClock, match: (pathname: string) => pathname === '/dashboard/immunization/due' },
  { path: '/dashboard/vaccine-catalogue', label: 'Vaccine Catalogue', icon: ClipboardList, match: (pathname: string) => pathname === '/dashboard/vaccine-catalogue' },
];

export default function ImmunizationSectionTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const visibleSections = sections.filter(section => section.path !== '/dashboard/vaccine-catalogue' || hasRole(['admin', 'super_admin']));

  return (
    <nav aria-label="Immunization sections" className="flex min-w-0 gap-1 overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-1">
      {visibleSections.map(section => {
        const active = section.match(location.pathname);
        const Icon = section.icon;
        return (
          <button
            key={section.path}
            type="button"
            onClick={() => navigate(section.path)}
            aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:flex-1 sm:px-4 ${active ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]'}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
