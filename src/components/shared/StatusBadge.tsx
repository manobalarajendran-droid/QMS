import { useTranslation } from 'react-i18next';

import type { RequirementStatus, TestStatus } from '../../types';
import { REQ_COLORS, TEST_COLORS, VARIANT_STYLES, resolveStatusVariant } from './statusBadgeUtils';
import type { BadgeVariant } from './statusBadgeUtils';

export interface StatusBadgeProps {
  status?: string;
  variant?: BadgeVariant;
  className?: string;
  type?: 'requirement' | 'test'; // Backward compatibility
}

export function StatusBadge({ status, variant, className = '', type }: StatusBadgeProps) {
  const { t } = useTranslation();

  // Backward compatibility with legacy tests and requirement/test views
  if (type) {
    const colors = type === 'requirement'
      ? REQ_COLORS[status as RequirementStatus]
      : TEST_COLORS[status as TestStatus];
    return (
      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight ${colors || ''} ${className}`}>
        {t(`statuses.${status}`)}
      </span>
    );
  }

  const activeVariant = variant || resolveStatusVariant(status);
  const colorClasses = VARIANT_STYLES[activeVariant];

  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight ${colorClasses} ${className}`}>
      {status || '—'}
    </span>
  );
}

