// src/pages/EditInsuranceClaim.tsx - Route resolver
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInsuranceStore } from '../store/insuranceStore';
import { useToast } from '../store/toastStore';
import { Loader2 } from 'lucide-react';

export default function EditInsuranceClaim() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getInsuranceClaim, currentClaim, isLoading } = useInsuranceStore();
  const { error: toastError } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    const loadAndRedirect = async () => {
      try {
        await getInsuranceClaim(id!);
        
        // Redirect to correct edit page based on claim type
        const claimType = currentClaim?.InsuranceProvider?.type;
        
        if (claimType === 'nhis') {
          navigate(`/dashboard/insurance-claims/nhis/${id}/edit`, { replace: true });
        } else if (claimType === 'private') {
          navigate(`/dashboard/insurance-claims/private/${id}/edit`, { replace: true });
        } else if (claimType === 'corporate') {
          navigate(`/dashboard/insurance-claims/corporate/${id}/edit`, { replace: true });
        } else {
          toastError('Unknown Claim Type', 'Cannot determine claim type');
          navigate('/dashboard/insurance-claims');
        }
      } catch (error) {
        toastError('Load Failed', 'Could not load claim');
        navigate('/dashboard/insurance-claims');
      } finally {
        setIsRedirecting(false);
      }
    };
    
    loadAndRedirect();
  }, [id]);

  if (isRedirecting || isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--icon-purple-text)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading claim details...</p>
        </div>
      </div>
    );
  }

  return null;
}