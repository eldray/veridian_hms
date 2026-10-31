// src/pages/InsuranceClaims.tsx - COMPLETE FIXED VERSION
import { useEffect, useState } from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useToast } from '../store/toastStore';
import {
  Plus,
  FileText,
  Download,
  Eye,
  DollarSign,
  PlayCircle,
  Calendar,
  User,
  Activity,
  RefreshCw,
  Lock,
  Printer,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import InsuranceTabs, { INSURANCE_FAMILIES, type InsuranceFamily } from '../components/InsuranceTabs';
import {
  Badge,
  cn,
  Button,
  Card,
  FilterSelect,
  humanStatus,
  INPUT,
  TD_MONO,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  statusTone,
  TABLE_SHELL,
  TD,
  TH,
  TH_ROW,
  TR,
} from '../components/ui';

export default function InsuranceClaims({ family }: { family: InsuranceFamily }) {
  const familyMeta = INSURANCE_FAMILIES.find((f) => f.key === family) ?? INSURANCE_FAMILIES[0];
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const {
    // NHIS Claims
    nhisClaims,
    getNHISClaims,
    generateNHISClaim,

    // Private Claims
    privateClaims,
    getPrivateInsuranceClaims,
    generatePrivateInsuranceClaim,

    // Corporate Claims
    corporateClaims,
    getCorporateClaims,
    generateCorporateClaim,

    // Common
    finalizeClaim,
    downloadClaimXml,
    printClaim,
    getClaimsSummary,
    summary,

    // UI State
    isLoading: claimsLoading,
  } = useInsuranceStore();

  const { attendances, getAttendances, isLoading: attendanceLoading } = useAttendanceStore();

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  // Which payer family this page shows comes from the tab bar, not from local state,
  // so the URL, the tabs and the list can never disagree.
  const activeTab: InsuranceFamily = family;
  const [showPendingAttendances, setShowPendingAttendances] = useState(false);
  const [processingClaims, setProcessingClaims] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const isLoading = claimsLoading || attendanceLoading;

  // Get current claims based on active tab
  const currentClaims =
    activeTab === 'nhis' ? nhisClaims : activeTab === 'private' ? privateClaims : corporateClaims;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, startDate, endDate]);

  const paymentModeForTab =
    activeTab === 'nhis' ? 'nhis' : activeTab === 'private' ? 'private_insurance' : 'corporate';

  const loadData = async () => {
    const filters: any = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // 1) Claims list — failure here should surface to the user.
    try {
      if (activeTab === 'nhis') {
        await getNHISClaims(filters);
      } else if (activeTab === 'private') {
        await getPrivateInsuranceClaims(filters);
      } else if (activeTab === 'corporate') {
        await getCorporateClaims(filters);
      }
    } catch (error: any) {
      toastError('Load failed', error?.response?.data?.message || error?.message || 'Could not fetch claims');
    }

    // 2) Attendance worklist — non-fatal.
    // Only visits that can still become a claim on THIS tab: completed, billed through this
    // payment mode, inside the selected window. Asking the server for that keeps the call to
    // a couple of requests instead of walking every visit in the hospital.
    try {
      const worklist: any = { status: 'completed', paymentMode: paymentModeForTab, limit: 200 };
      worklist.dateFrom = startDate
        ? new Date(startDate).toISOString()
        : new Date(Date.now() - 30 * 86_400_000).toISOString();
      if (endDate) {
        const to = new Date(endDate);
        to.setHours(23, 59, 59, 999);
        worklist.dateTo = to.toISOString();
      }
      await getAttendances(worklist);
    } catch {
      /* non-fatal */
    }

    // 3) Summary — non-fatal; failure must not blank the table.
    try {
      await getClaimsSummary(activeTab);
    } catch {
      /* non-fatal */
    }
  };

  const getPatientFullName = (patient: any) => {
    if (!patient) return 'Unknown';
    return (
      patient.name ||
      patient.fullName ||
      `${patient.surname || ''} ${patient.otherNames || ''}`.trim() ||
      'Unknown'
    );
  };

  // Get eligible attendances based on active tab
  const getEligibleAttendances = () => {
    const paymentMode =
      activeTab === 'nhis' ? 'nhis' : activeTab === 'private' ? 'private_insurance' : 'corporate';
    return attendances.filter(
      (att) =>
        att.paymentMode === paymentMode &&
        att.status === 'completed' &&
        !currentClaims.some((c) => c.attendanceId === att.id)
    );
  };

  const eligibleAttendances = getEligibleAttendances();

  // Stats for current tab
  const currentStats = {
    total: currentClaims.length,
    draft: currentClaims.filter((c: any) => c.status === 'draft').length,
    submitted: currentClaims.filter((c: any) => c.status === 'finalized').length,
    approved: currentClaims.filter((c: any) => c.status === 'approved').length,
    paid: currentClaims.filter((c: any) => c.status === 'paid').length,
    rejected: currentClaims.filter((c: any) => c.status === 'rejected').length,
    totalAmount: currentClaims.reduce((sum: number, c: any) => sum + (c.totalClaimAmount || 0), 0),
    approvedAmount: currentClaims
      .filter((c: any) => c.status === 'approved')
      .reduce((sum: number, c: any) => sum + (c.approvedAmount || 0), 0),
    paidAmount: currentClaims
      .filter((c: any) => c.status === 'paid')
      .reduce((sum: number, c: any) => sum + (c.paidAmount || 0), 0),
    // summary.finalized is the server's authoritative "finalized/submitted" total.
    finalizedAmount: summary?.finalized?.totalAmount || 0,
  };

  // Filter claims by search and status
  const filteredClaims = currentClaims.filter((claim: any) => {
    const matchesSearch =
      claim.claimNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPatientFullName(claim.patient).toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.insuranceProvider?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.corporateAccount?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;

    let matchesDate = true;
    if (startDate && claim.Attendance?.dateTime) {
      const claimDate = new Date(claim.Attendance.dateTime);
      const start = new Date(startDate);
      matchesDate = matchesDate && claimDate >= start;
    }
    if (endDate && claim.Attendance?.dateTime) {
      const claimDate = new Date(claim.Attendance.dateTime);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && claimDate <= end;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClaims = filteredClaims.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, activeTab, startDate, endDate]);

  const handleGenerateClaim = async (attendanceId: string) => {
    try {
      setProcessingClaims((prev) => new Set(prev).add(attendanceId));

      if (activeTab === 'nhis') {
        await generateNHISClaim(attendanceId);
        success('NHIS Claim Generated', 'Claim draft created successfully');
      } else if (activeTab === 'private') {
        await generatePrivateInsuranceClaim(attendanceId);
        success('Private Insurance Claim Generated', 'Claim draft created successfully');
      } else {
        await generateCorporateClaim(attendanceId);
        success('Corporate Claim Generated', 'Claim created successfully');
      }

      await loadData();
      setShowPendingAttendances(false);
    } catch (error: any) {
      toastError(
        'Generation failed',
        error?.response?.data?.message || error?.message || 'Could not generate claim'
      );
    } finally {
      setProcessingClaims((prev) => {
        const newSet = new Set(prev);
        newSet.delete(attendanceId);
        return newSet;
      });
    }
  };

  const handleFinalizeClaim = async (claimId: string) => {
    try {
      setProcessingClaims((prev) => new Set(prev).add(claimId));
      await finalizeClaim(claimId);
      success('Claim finalized', 'Claim is now ready for submission');
      await loadData();
    } catch (error: any) {
      toastError('Finalize failed', error?.response?.data?.message || error?.message || 'Could not finalize claim');
    } finally {
      setProcessingClaims((prev) => {
        const newSet = new Set(prev);
        newSet.delete(claimId);
        return newSet;
      });
    }
  };

  const handleDownloadXML = async (claimId: string) => {
    try {
      setProcessingClaims((prev) => new Set(prev).add(claimId));
      await downloadClaimXml(claimId);
      success('XML ready', 'Claim XML file is downloading');
    } catch (error: any) {
      toastError('Download failed', error?.message || 'Could not generate XML');
    } finally {
      setProcessingClaims((prev) => {
        const newSet = new Set(prev);
        newSet.delete(claimId);
        return newSet;
      });
    }
  };

  const handlePrintClaim = async (claimId: string) => {
    try {
      setProcessingClaims((prev) => new Set(prev).add(claimId));
      await printClaim(claimId);
      success('Print ready', 'Claim data ready for printing');
    } catch (error: any) {
      toastError('Print failed', error?.message || 'Could not generate print format');
    } finally {
      setProcessingClaims((prev) => {
        const newSet = new Set(prev);
        newSet.delete(claimId);
        return newSet;
      });
    }
  };

  const getDateFilterDisplay = () => {
    if (startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    }
    if (startDate) return `From ${new Date(startDate).toLocaleDateString()}`;
    if (endDate) return `Until ${new Date(endDate).toLocaleDateString()}`;
    return 'All Dates';
  };

  return (
    <div className="space-y-6 p-6 text-[var(--text-primary)]">
      {/* Header */}
      <PageHeader
        title={`${familyMeta.label} claims`}
        subtitle="Generate, finalize and follow up what this payer is owed."
        meta={`${filteredClaims.length} claims • GHS ${currentStats.totalAmount.toFixed(2)} total • ${getDateFilterDisplay()}`}
        icon={familyMeta.icon}
        accent={familyMeta.accent}
        backTo="/dashboard"
        tabs={<InsuranceTabs family={family} section="claims" />}
        actions={(
          <>
            {eligibleAttendances.length > 0 && (
              <Button
                variant="soft"
                accent="green"
                icon={Plus}
                onClick={() => setShowPendingAttendances(!showPendingAttendances)}
              >
                New Claim ({eligibleAttendances.length})
              </Button>
            )}
            <Button icon={RefreshCw} loading={isLoading} onClick={loadData}>Refresh</Button>
          </>
        )}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard label="Total claims" value={currentStats.total} />
        <StatCard label="Draft" value={currentStats.draft} accent="yellow" />
        <StatCard label="Submitted" value={currentStats.submitted} accent="purple" />
        <StatCard label="Approved" value={currentStats.approved} accent="green" />
        <StatCard label="Paid" value={currentStats.paid} accent="cyan" />
        <StatCard label="Total claimed" size="money" value={`GHS ${currentStats.totalAmount.toFixed(2)}`} />
        <StatCard label="Approved total" size="money" accent="green" value={`GHS ${currentStats.approvedAmount.toFixed(2)}`} />
      </div>

      {/* Eligible Attendances */}
      {showPendingAttendances && eligibleAttendances.length > 0 && (
        <Card
          title={`Eligible for ${familyMeta.label} claims (${eligibleAttendances.length})`}
          description="Completed visits billed to this payer that have no claim yet."
          icon={PlayCircle}
          accent="green"
        >
          <div className="space-y-3">
            {eligibleAttendances.slice(0, 5).map((att) => (
              <div key={att.id} className="rounded-lg border border-[var(--border-color)] bg-[var(--icon-green-bg)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm font-mono">{att.attendanceNumber}</h3>
                      <Badge tone="green" dot size="sm">Completed</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span className="truncate">{getPatientFullName(att.patient)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(att.dateTime).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        <span>{att.attendanceType}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>GHS {att.totalBill?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="soft"
                    accent="green"
                    icon={Plus}
                    loading={processingClaims.has(att.id)}
                    onClick={() => handleGenerateClaim(att.id)}
                  >
                    Generate claim
                  </Button>
                </div>
              </div>
            ))}
            {eligibleAttendances.length > 5 && (
              <p className="text-center text-sm text-[var(--text-secondary)] pt-2">
                +{eligibleAttendances.length - 5} more eligible attendances
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <SearchInput
            className="w-full sm:max-w-sm"
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={
              activeTab === 'corporate'
                ? 'Search by claim number, patient, or company…'
                : 'Search by claim number, patient, or provider…'
            }
          />

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="Attendance date from"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={INPUT}
              />
              <span className="text-[var(--text-tertiary)] text-sm">to</span>
              <input
                type="date"
                aria-label="Attendance date to"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={INPUT}
              />
            </div>

            <FilterSelect
              aria-label="Filter by status"
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: 'all', label: 'All status' },
                { value: 'draft', label: 'Draft' },
                { value: 'finalized', label: 'Finalized' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'paid', label: 'Paid' },
              ]}
            />

            <FilterSelect
              aria-label="Rows per page"
              value={String(itemsPerPage)}
              onChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
              options={[
                { value: '10', label: '10 per page' },
                { value: '20', label: '20 per page' },
                { value: '50', label: '50 per page' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Claims Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse"
            >
              <div className="h-4 bg-[var(--bg-main)] rounded w-1/4 mb-3"></div>
              <div className="h-3 bg-[var(--bg-main)] rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-[var(--bg-main)] rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredClaims.length === 0 ? (
        <Card className="py-10 text-center">
          <FileText className="w-14 h-14 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)]">No {familyMeta.label} claims found</p>
          {eligibleAttendances.length > 0 && (
            <p className="text-[var(--text-tertiary)] text-sm mt-1">
              {eligibleAttendances.length} completed visits ready for claims
            </p>
          )}
        </Card>
      ) : (
        <>
          <div className={TABLE_SHELL}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={TH_ROW}>
                  <tr>
                    <th className={TH}>Claim number</th>
                    <th className={TH}>Patient</th>
                    <th className={TH}>Folder #</th>
                    <th className={TH}>Attendance #</th>
                    <th className={TH}>{activeTab === 'corporate' ? 'Corporate account' : 'Provider'}</th>
                    <th className={TH}>Status</th>
                    <th className={cn(TH, 'text-right')}>Claim amount</th>
                    <th className={cn(TH, 'text-right')}>Approved</th>
                    <th className={cn(TH, 'text-right')}>Paid</th>
                    <th className={TH}>Submitted</th>
                    <th className={cn(TH, 'text-center')}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClaims.map((claim: any) => (
                    <tr key={claim.id} className={TR}>
                      <td className={TD_MONO}>{claim.claimNumber}</td>
                      <td className={TD}>{getPatientFullName(claim.patient)}</td>
                      <td className={TD_MONO}>{claim.Patient?.folderNumber || claim.patient?.folderNumber || '—'}</td>
                      <td className={TD_MONO}>{claim.Attendance?.attendanceNumber || claim.attendance?.attendanceNumber || '—'}</td>
                      <td className={TD}>
                        {activeTab === 'corporate'
                          ? claim.corporateAccount?.companyName || '—'
                          : claim.insuranceProvider?.name || '—'}
                      </td>
                      <td className={TD}>
                        <Badge tone={statusTone(claim.status)} dot size="sm">{humanStatus(claim.status)}</Badge>
                      </td>
                      <td className={cn(TD, 'text-right font-medium')}>GHS {claim.totalClaimAmount?.toFixed(2)}</td>
                      <td className={cn(TD, 'text-right')}>
                        {claim.approvedAmount ? `GHS ${claim.approvedAmount.toFixed(2)}` : '—'}
                      </td>
                      <td className={cn(TD, 'text-right')}>
                        {claim.paidAmount ? `GHS ${claim.paidAmount.toFixed(2)}` : '—'}
                      </td>
                      <td className={TD}>
                        {claim.submissionDate ? new Date(claim.submissionDate).toLocaleDateString() : '—'}
                      </td>
                      <td className={TD}>
                        <div className="flex items-center justify-center gap-1.5">
                          {claim.status === 'finalized' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                iconOnly
                                icon={Download}
                                title="Download XML"
                                disabled={processingClaims.has(claim.id)}
                                onClick={() => handleDownloadXML(claim.id)}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                iconOnly
                                icon={Printer}
                                title="Print claim"
                                disabled={processingClaims.has(claim.id)}
                                onClick={() => handlePrintClaim(claim.id)}
                              />
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            iconOnly
                            icon={Eye}
                            title={claim.status === 'draft' ? 'Edit claim' : 'View claim'}
                            onClick={() => navigate(`/dashboard/insurance/claims/${claim.id}/edit`)}
                          />
                          {claim.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              iconOnly
                              icon={Lock}
                              title="Finalize claim"
                              className="text-[var(--icon-purple-text)]"
                              disabled={processingClaims.has(claim.id)}
                              onClick={() => handleFinalizeClaim(claim.id)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredClaims.length}
            noun="claims"
            onChange={goToPage}
          />
        </>
      )}
    </div>
  );
}