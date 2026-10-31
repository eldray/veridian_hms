// src/pages/InsuranceProviders.tsx
import { useEffect, useMemo, useState } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import { useInsuranceStore } from '../store/insuranceStore';
import { useAuthStore } from '../store/authStore';
import { isAdminLike } from '../config/access';
import { useToast } from '../store/toastStore';
import type { InsuranceProvider } from '../types';
import {
  Building,
  Edit,
  Grid3X3,
  List,
  Mail,
  Phone,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Shield,
  Trash2,
  User,
  X,
} from 'lucide-react';
import InsuranceTabs, { INSURANCE_FAMILIES, type InsuranceFamily } from '../components/InsuranceTabs';
import {
  accentVar,
  Badge,
  Button,
  cn,
  Field,
  FilterSelect,
  INPUT,
  PageHeader,
  SearchInput,
  Segmented,
  TD,
  TH,
  TH_ROW,
  TR,
} from '../components/ui';

type ProviderForm = {
  name: string;
  coveragePercentage: number;
  isActive: boolean;
  contactInfo: { phone: string; email: string; address: string; contactPerson: string };
};

/** The payer families this screen handles; corporate employers have their own accounts page. */
type ProviderFamily = Exclude<InsuranceFamily, 'corporate'>;

export default function InsuranceProviders({ family }: { family: ProviderFamily }) {
  const familyMeta = INSURANCE_FAMILIES.find((f) => f.key === family) ?? INSURANCE_FAMILIES[0];
  const { success, error: toastError } = useToast();

  const {
    providers,
    getInsuranceProviders,
    createInsuranceProvider,
    updateInsuranceProvider,
    toggleInsuranceProviderStatus,
    deleteInsuranceProvider,
    isLoading,
  } = useInsuranceStore();

  const { user } = useAuthStore();
  const canManage = isAdminLike(user?.role);

  const blankForm = (): ProviderForm => ({
    name: '',
    coveragePercentage: family === 'nhis' ? 100 : 80,
    isActive: true,
    contactInfo: { phone: '', email: '', address: '', contactPerson: '' },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProviderForm>(blankForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getInsuranceProviders();
  }, [getInsuranceProviders]);

  // This page belongs to one payer family; the tab bar above decides which one.
  const familyProviders = useMemo(
    () => providers.filter((p) => p.type === family),
    [providers, family],
  );

  const contactOf = (provider: InsuranceProvider) => provider.contactInfo ?? {};

  const filteredProviders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return familyProviders.filter((provider) => {
      const contact = provider.contactInfo ?? {};
      const matchesSearch =
        !query ||
        provider.name?.toLowerCase().includes(query) ||
        contact.phone?.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.contactPerson?.toLowerCase().includes(query);
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && provider.isActive) ||
        (filterStatus === 'inactive' && !provider.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [familyProviders, searchTerm, filterStatus]);

  const activeCount = familyProviders.filter((p) => p.isActive).length;

  const openAddForm = () => {
    setEditingId(null);
    setFormData(blankForm());
    setShowForm(true);
  };

  const openEditForm = (provider: InsuranceProvider) => {
    const contact = provider.contactInfo ?? {};
    setEditingId(provider.id);
    setFormData({
      name: provider.name ?? '',
      coveragePercentage: Number(provider.coveragePercentage ?? 0),
      isActive: provider.isActive !== false,
      contactInfo: {
        phone: contact.phone ?? '',
        email: contact.email ?? '',
        address: contact.address ?? '',
        contactPerson: contact.contactPerson ?? '',
      },
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toastError('Provider name required', 'Every provider record needs a name before it can be saved.');
      return;
    }
    const payload = { ...formData, name: formData.name.trim(), type: family };
    setSaving(true);
    try {
      if (editingId) {
        await updateInsuranceProvider(editingId, payload);
        success('Provider updated', `${payload.name} saved.`);
      } else {
        await createInsuranceProvider(payload);
        success('Provider added', `${payload.name} is now selectable on claims.`);
      }
      setShowForm(false);
      setEditingId(null);
      await getInsuranceProviders();
    } catch (error: any) {
      toastError(
        editingId ? 'Could not update provider' : 'Could not add provider',
        error?.response?.data?.message || error?.message || 'Check the details and save again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (provider: InsuranceProvider) => {
    const action = provider.isActive ? 'deactivate' : 'activate';
    const confirmed = await confirmDialog({
      title: 'Change provider status',
      message: `Are you sure you want to ${action} ${provider.name}? ${provider.isActive
        ? 'Claims already raised against it are untouched.'
        : 'Inactive providers cannot be selected on new claims.'}`,
      confirmText: provider.isActive ? 'Deactivate' : 'Activate',
      type: 'warning',
    });
    if (!confirmed) return;
    try {
      await toggleInsuranceProviderStatus(provider.id);
      success('Status updated', `${provider.name} is now ${provider.isActive ? 'inactive' : 'active'}.`);
      await getInsuranceProviders();
    } catch (error: any) {
      toastError('Could not change status', error?.response?.data?.message || error?.message || 'Please try again.');
    }
  };

  const handleDelete = async (provider: InsuranceProvider) => {
    const confirmed = await confirmDialog({
      title: 'Delete provider',
      message: `Delete ${provider.name}? Claims already linked to it are kept, but the provider disappears from new claims.`,
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    try {
      await deleteInsuranceProvider(provider.id);
      success('Provider deleted', `${provider.name} removed.`);
      await getInsuranceProviders();
    } catch (error: any) {
      const reason = error?.response?.data?.message || error?.message || '';
      toastError(
        'Could not delete provider',
        reason || 'This provider has records against it. Deactivate it instead of deleting.',
      );
    }
  };

  const FamilyIcon = family === 'nhis' ? Shield : Building;

  return (
    <div className="space-y-5 p-4 md:p-6 text-[var(--text-primary)]">
      <PageHeader
        title={`${familyMeta.label} providers`}
        subtitle={
          family === 'nhis'
            ? 'The national scheme — coverage, contact route and whether it is still usable on new claims.'
            : 'Private insurers — cover percentages and who to chase for each scheme.'
        }
        meta={`${familyProviders.length} provider${familyProviders.length === 1 ? '' : 's'} · ${activeCount} active${filteredProviders.length !== familyProviders.length ? ` · ${filteredProviders.length} shown` : ''}`}
        icon={FamilyIcon}
        accent={familyMeta.accent}
        backTo="/dashboard"
        tabs={<InsuranceTabs family={family} section="providers" />}
        actions={(
          <>
            {canManage && (
              <Button variant="soft" accent={familyMeta.accent} icon={Plus} onClick={openAddForm}>
                Add provider
              </Button>
            )}
            <Button icon={RefreshCw} loading={isLoading} onClick={() => void getInsuranceProviders()}>
              Refresh
            </Button>
          </>
        )}
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by name, phone, email or contact person…"
        />
        <FilterSelect
          aria-label="Provider status"
          value={filterStatus}
          onChange={(value) => setFilterStatus(value as 'all' | 'active' | 'inactive')}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active only' },
            { value: 'inactive', label: 'Inactive only' },
          ]}
        />
        <Segmented
          aria-label="Provider layout"
          accent={familyMeta.accent}
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'grid', label: 'Grid', icon: Grid3X3 },
            { value: 'list', label: 'List', icon: List },
          ]}
        />
      </div>

      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 animate-pulse">
              <div className="h-5 bg-[var(--bg-main)] rounded w-2/3 mb-3" />
              <div className="h-3.5 bg-[var(--bg-main)] rounded w-1/3 mb-2" />
              <div className="h-3.5 bg-[var(--bg-main)] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl py-14 text-center">
          <FamilyIcon className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
          <p className="font-semibold text-[var(--text-primary)]">
            {familyProviders.length === 0 ? `No ${familyMeta.label.toLowerCase()} providers yet` : 'No provider matches the search'}
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {familyProviders.length === 0
              ? 'Add the scheme so its claims record who pays and how much of the bill it covers.'
              : 'Clear the filters to see the full list.'}
          </p>
          {familyProviders.length === 0 && canManage && (
            <Button className="mt-4" variant="soft" accent={familyMeta.accent} icon={Plus} onClick={openAddForm}>
              Add provider
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProviders.map((provider) => {
            const contact = contactOf(provider);
            return (
              <div
                key={provider.id}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-3 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: accentVar(familyMeta.accent, 'bg'), color: accentVar(familyMeta.accent, 'text') }}
                  >
                    <FamilyIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate" title={provider.name}>
                      {provider.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge tone={provider.isActive ? 'green' : 'neutral'} dot>
                        {provider.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge tone={familyMeta.accent}>{Number(provider.coveragePercentage ?? 0)}% covered</Badge>
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      size="xs"
                      variant="ghost"
                      iconOnly
                      icon={provider.isActive ? PowerOff : Power}
                      aria-label={provider.isActive ? `Deactivate ${provider.name}` : `Activate ${provider.name}`}
                      className={provider.isActive ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}
                      onClick={() => void handleToggleStatus(provider)}
                    />
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  {contact.contactPerson && (
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{contact.contactPerson}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{contact.phone}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.address && <p className="text-[var(--text-tertiary)] leading-snug">{contact.address}</p>}
                  {!contact.contactPerson && !contact.phone && !contact.email && !contact.address && (
                    <p className="text-[var(--text-tertiary)]">No contact details recorded yet.</p>
                  )}
                </div>

                {canManage && (
                  <div className="flex gap-2 pt-2 mt-auto border-t border-[var(--border-color)]">
                    <Button size="xs" variant="secondary" icon={Edit} className="flex-1" onClick={() => openEditForm(provider)}>
                      Edit
                    </Button>
                    <Button size="xs" variant="dangerSoft" icon={Trash2} className="flex-1" onClick={() => void handleDelete(provider)}>
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={TH_ROW}>
                  <th className={TH}>Provider</th>
                  <th className={TH}>Coverage</th>
                  <th className={TH}>Contact</th>
                  <th className={TH}>Status</th>
                  {canManage && <th className={cn(TH, 'text-right')}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredProviders.map((provider) => {
                  const contact = contactOf(provider);
                  return (
                    <tr key={provider.id} className={TR}>
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: accentVar(familyMeta.accent, 'bg'), color: accentVar(familyMeta.accent, 'text') }}
                          >
                            <FamilyIcon className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-[var(--text-primary)]">{provider.name}</span>
                        </div>
                      </td>
                      <td className={TD}>{Number(provider.coveragePercentage ?? 0)}%</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)] whitespace-normal">
                        {contact.contactPerson || '—'}
                        {contact.phone && <div>{contact.phone}</div>}
                        {contact.email && <div>{contact.email}</div>}
                      </td>
                      <td className={TD}>
                        <Badge tone={provider.isActive ? 'green' : 'neutral'} dot size="sm">
                          {provider.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      {canManage && (
                        <td className={cn(TD, 'text-right')}>
                          <div className="inline-flex gap-1.5">
                            <Button
                              size="xs"
                              variant="ghost"
                              iconOnly
                              icon={provider.isActive ? PowerOff : Power}
                              aria-label={provider.isActive ? 'Deactivate' : 'Activate'}
                              className={provider.isActive ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}
                              onClick={() => void handleToggleStatus(provider)}
                            />
                            <Button size="xs" variant="ghost" iconOnly icon={Edit} aria-label="Edit provider" onClick={() => openEditForm(provider)} />
                            <Button size="xs" variant="dangerSoft" iconOnly icon={Trash2} aria-label="Delete provider" onClick={() => void handleDelete(provider)} />
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--text-tertiary)]">
        Coverage is the share of a bill this payer is expected to meet. It seeds a new claim and can still be
        adjusted per claim when the payer settles less.
      </p>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: accentVar(familyMeta.accent, 'bg'), color: accentVar(familyMeta.accent, 'text') }}
                >
                  <FamilyIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    {editingId ? 'Edit provider' : 'Add provider'}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">{familyMeta.label}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close" disabled={saving} onClick={() => setShowForm(false)} />
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Provider name" required>
                  <input
                    className={cn(INPUT, 'w-full')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={family === 'nhis' ? 'National Health Insurance and Welfare Scheme' : 'e.g. Metropolitan Health'}
                  />
                </Field>
                <Field label="Coverage %" required hint="Share of the bill this payer settles.">
                  <input
                    className={cn(INPUT, 'w-full')}
                    type="number"
                    min={0}
                    max={100}
                    value={formData.coveragePercentage}
                    onChange={(e) => setFormData({ ...formData, coveragePercentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                  />
                </Field>
              </div>

              <div className="border-t border-[var(--border-color)] pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-3">Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Contact person">
                    <input
                      className={cn(INPUT, 'w-full')}
                      value={formData.contactInfo.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, contactPerson: e.target.value } })}
                      placeholder="Claims officer"
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      className={cn(INPUT, 'w-full')}
                      type="tel"
                      value={formData.contactInfo.phone}
                      onChange={(e) => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, phone: e.target.value } })}
                      placeholder="024 000 0000"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      className={cn(INPUT, 'w-full')}
                      type="email"
                      value={formData.contactInfo.email}
                      onChange={(e) => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, email: e.target.value } })}
                      placeholder="claims@insurer.com"
                    />
                  </Field>
                  <Field label="Status">
                    <FilterSelect
                      className="w-full"
                      value={formData.isActive ? 'active' : 'inactive'}
                      onChange={(value) => setFormData({ ...formData, isActive: value === 'active' })}
                      options={[
                        { value: 'active', label: 'Active — selectable on new claims' },
                        { value: 'inactive', label: 'Inactive — hidden from new claims' },
                      ]}
                    />
                  </Field>
                  <Field label="Address" className="md:col-span-2">
                    <textarea
                      className={cn(INPUT, 'w-full')}
                      rows={2}
                      value={formData.contactInfo.address}
                      onChange={(e) => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, address: e.target.value } })}
                      placeholder="Full address"
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
                <Button variant="secondary" disabled={saving} onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="soft" accent={familyMeta.accent} loading={saving}>
                  {editingId ? 'Save changes' : 'Add provider'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
