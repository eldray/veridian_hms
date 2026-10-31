import { Briefcase, Building, FileText, Layers, Shield, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { canAccessPage, type PageKey } from '../config/access';
import { useAuthStore } from '../store/authStore';
import { Tabs, Segmented } from './ui/Tabs';
import type { Accent } from './ui/accent';

/**
 * The insurance area is split by who pays, not by which screen was built first:
 * NHIS, private insurers and corporate employers each get their own page with the
 * sections that belong to them. Corporate accounts are the corporate family's
 * "providers", so they lead that page instead of sitting on a fourth tab.
 */
export type InsuranceFamily = 'nhis' | 'private' | 'corporate';
export type InsuranceSection = 'claims' | 'providers' | 'batches' | 'tracking' | 'accounts';

const BASE = '/dashboard/insurance';

export const INSURANCE_FAMILIES: { key: InsuranceFamily; label: string; icon: LucideIcon; accent: Accent }[] = [
  { key: 'nhis', label: 'NHIS', icon: Shield, accent: 'green' },
  { key: 'private', label: 'Private insurance', icon: Building, accent: 'blue' },
  { key: 'corporate', label: 'Corporate', icon: Briefcase, accent: 'indigo' },
];

interface SectionDef {
  key: InsuranceSection;
  label: string;
  icon: LucideIcon;
  pageKey: PageKey;
}

const SECTIONS: Record<InsuranceFamily, SectionDef[]> = {
  nhis: [
    { key: 'claims', label: 'Claims', icon: FileText, pageKey: 'insurance_claims' },
    { key: 'providers', label: 'Providers', icon: Shield, pageKey: 'insurance_providers' },
    { key: 'batches', label: 'Claim batches', icon: Layers, pageKey: 'insurance_claims' },
    { key: 'tracking', label: 'Tracking & payments', icon: Layers, pageKey: 'insurance_claims' },
  ],
  private: [
    { key: 'claims', label: 'Claims', icon: FileText, pageKey: 'insurance_claims' },
    { key: 'providers', label: 'Providers', icon: Building, pageKey: 'insurance_providers' },
    { key: 'batches', label: 'Claim batches', icon: Layers, pageKey: 'insurance_claims' },
    { key: 'tracking', label: 'Tracking & payments', icon: Layers, pageKey: 'insurance_claims' },
  ],
  corporate: [
    { key: 'accounts', label: 'Accounts', icon: Users, pageKey: 'corporate' },
    { key: 'claims', label: 'Claims', icon: FileText, pageKey: 'insurance_claims' },
    { key: 'batches', label: 'Claim batches', icon: Layers, pageKey: 'insurance_claims' },
    { key: 'tracking', label: 'Tracking & payments', icon: Layers, pageKey: 'insurance_claims' },
  ],
};

export function insuranceSectionPath(family: InsuranceFamily, section: InsuranceSection): string {
  return `${BASE}/${family}/${section}`;
}

/** Sections a role may open, in tab order. */
export function visibleInsuranceSections(family: InsuranceFamily, role?: string) {
  return SECTIONS[family].filter((section) => canAccessPage(role, section.pageKey));
}

function firstAllowedSection(family: InsuranceFamily, role?: string): InsuranceSection {
  return visibleInsuranceSections(family, role)[0]?.key ?? 'claims';
}

export interface InsuranceTabsProps {
  family: InsuranceFamily;
  section: InsuranceSection;
}

/**
 * Two-level navigation: the payer family on top, its sections underneath. Both rows
 * are navigation, because every section is a route of its own — that keeps the back
 * button, deep links and the quick-access launcher honest.
 */
export default function InsuranceTabs({ family, section }: InsuranceTabsProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const role = user?.role;

  const accent = INSURANCE_FAMILIES.find((f) => f.key === family)?.accent ?? 'cyan';
  const sections = visibleInsuranceSections(family, role);

  return (
    <div className="space-y-3">
      <Segmented
        aria-label="Payer family"
        accent={accent}
        value={family}
        onChange={(nextFamily) => navigate(insuranceSectionPath(nextFamily, firstAllowedSection(nextFamily, role)))}
        options={INSURANCE_FAMILIES
          .filter((f) => visibleInsuranceSections(f.key, role).length > 0)
          .map((f) => ({ value: f.key, label: f.label, icon: f.icon }))}
      />
      <Tabs
        aria-label="Insurance sections"
        accent={accent}
        active={section}
        onChange={(key) => navigate(insuranceSectionPath(family, key))}
        tabs={sections.map((s) => ({ key: s.key, label: s.label, icon: s.icon }))}
      />
    </div>
  );
}
