// src/pages/EditInsuranceClaim.tsx - Route resolver
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInsuranceStore } from '../store/insuranceStore';
import { useToast } from '../store/toastStore';
import { FileText, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/ui';

export default function EditInsuranceClaim() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getInsuranceClaim, currentClaim, isLoading } = useInsuranceStore();
  const { error: toastError } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    const loadAndRedirect = async () => {
      try {
        // Use the returned claim — `currentClaim` from the closure is stale here
        // (still null on first load), which previously broke type detection.
        const claim = await getInsuranceClaim(id!);

        // Redirect to correct edit page based on claim type
        const claimType = claim?.InsuranceProvider?.type;

        if (claimType === 'nhis') {
          navigate(`/dashboard/insurance/claims/nhis/${id}/edit`, { replace: true });
        } else if (claimType === 'private') {
          navigate(`/dashboard/insurance/claims/private/${id}/edit`, { replace: true });
        } else if (claimType === 'corporate') {
          navigate(`/dashboard/insurance/claims/corporate/${id}/edit`, { replace: true });
        } else {
          toastError('Unknown Claim Type', 'Cannot determine claim type');
          navigate('/dashboard/insurance');
        }
      } catch (error) {
        toastError('Load Failed', 'Could not load claim');
        navigate('/dashboard/insurance');
      } finally {
        setIsRedirecting(false);
      }
    };
    
    loadAndRedirect();
  }, [id]);

  if (isRedirecting || isLoading) {
    // The resolver never owns a header of its own once the claim's family is known —
    // the edit screen it redirects to renders that (and the route-backed insurance tabs
    // belong to those pages, not here). While it works it still opens with the shared
    // PageHeader, like every other screen in the area.
    return (
      <div className="space-y-6 p-6 text-[var(--text-primary)]">
        <PageHeader
          title="Insurance claims"
          subtitle="Opening the correct edit screen for this claim…"
          icon={FileText}
          accent="yellow"
          backTo="/dashboard/insurance"
        />
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[var(--icon-purple-text)] mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">Loading claim details...</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}