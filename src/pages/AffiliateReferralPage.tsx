import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { affiliateAttributionService, normalizeAffiliateCode } from '../services/affiliate-attribution.service';

export const AffiliateReferralPage = () => {
  const { affiliateCode } = useParams<{ affiliateCode: string }>();
  const navigate = useNavigate();
  const normalizedCode = normalizeAffiliateCode(affiliateCode);

  React.useEffect(() => {
    if (!normalizedCode) {
      navigate('/signup', { replace: true });
      return;
    }

    affiliateAttributionService.rememberAffiliateCode(normalizedCode);
    navigate(`/signup?ref=${normalizedCode}`, { replace: true });
  }, [navigate, normalizedCode]);

  return null;
};
