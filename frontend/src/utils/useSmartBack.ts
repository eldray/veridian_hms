import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Returns to the actual previous in-app page whenever navigation history exists.
 * A page opened directly (or refreshed) uses its owning list/page as a safe fallback.
 */
export function useSmartBack(fallbackPath = '/dashboard') {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }

    const state = location.state as { from?: unknown } | null;
    const from = typeof state?.from === 'string' ? state.from : '';
    if (from.startsWith('/') && !from.startsWith('//')) {
      navigate(from, { replace: true });
      return;
    }

    navigate(fallbackPath, { replace: true });
  }, [fallbackPath, location.key, location.state, navigate]);
}
