import * as React from 'react';
import { BadgeCheck } from 'lucide-react';
import { affiliateAttributionService } from '../../services/affiliate-attribution.service';

export const AffiliateNotice = () => {
  const affiliateCode = affiliateAttributionService.getSnapshot().affiliateCode;

  if (!affiliateCode) {
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
      <div className="flex items-start gap-3">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <div>
          <p className="font-medium">Indicação ativa</p>
          <p className="mt-1 text-sky-700">
            Este acesso está associado ao parceiro <strong>{affiliateCode}</strong>. Se você
            finalizar a primeira compra, a comissão seguirá essa indicação.
          </p>
        </div>
      </div>
    </div>
  );
};
