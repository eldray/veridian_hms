import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Send } from 'lucide-react';
import { getReferralById } from '../api';
import ReferralDetailModal from '../components/referral/ReferralDetailModal';
import { Button, PageHeader } from '../components/ui';
import { useToast } from '../store/toastStore';

export default function ReferralDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [referral, setReferral] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadReferral = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await getReferralById(id);
      setReferral(response?.data ?? response);
    } catch (error: any) {
      setReferral(null);
      toastError('Unable to load referral', error?.response?.data?.message || error?.message || 'The referral could not be found.');
    } finally {
      setLoading(false);
    }
  }, [id, toastError]);

  useEffect(() => { void loadReferral(); }, [loadReferral]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Referral details"
        subtitle={referral?.referralNumber ? `Referral ${referral.referralNumber}` : 'Review the referral record'}
        icon={Send}
        accent="cyan"
        actions={
          <>
            <Button icon={ArrowLeft} variant="secondary" onClick={() => navigate('/dashboard/referrals')}>Back to referrals</Button>
            <Button icon={RefreshCw} variant="soft" loading={loading} onClick={loadReferral}>Refresh</Button>
          </>
        }
      />
      {loading && !referral ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-secondary)]">Loading referral…</div>
      ) : referral ? (
        <ReferralDetailModal open referral={referral} onClose={() => navigate('/dashboard/referrals')} fullPage />
      ) : (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center">
          <p className="font-semibold text-[var(--text-primary)]">Referral not available</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">It may have been removed or you may not have access to it.</p>
          <div className="mt-4"><Button onClick={() => navigate('/dashboard/referrals')}>Return to referrals</Button></div>
        </div>
      )}
    </div>
  );
}
