'use client';

import { cn } from '@/lib/utils';

const CATEGORIES = ['saas', 'infrastructure', 'payments', 'hr', 'other'] as const;
const RISK_RATINGS = ['critical', 'high', 'medium', 'low'] as const;

const RISK_LABEL: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const CATEGORY_LABEL: Record<string, string> = {
  saas: 'SaaS',
  infrastructure: 'Infrastructure',
  payments: 'Payments',
  hr: 'HR',
  other: 'Other',
};

const RISK_CELL_COLOR: Record<string, string> = {
  critical: 'bg-red-100 border-red-300 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-300',
  high: 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300',
  medium: 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300',
  low: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300',
};

interface Vendor {
  id: string;
  category: string;
  riskRating: string;
}

interface RiskHeatmapProps {
  vendors: Vendor[];
}

export function RiskHeatmap({ vendors }: RiskHeatmapProps) {
  const cellCount = (category: string, risk: string) =>
    vendors.filter((v) => v.category === category && v.riskRating === risk).length;

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border p-2 text-left text-muted-foreground font-normal bg-muted/50 w-32">
              Category ↓ Risk →
            </th>
            {RISK_RATINGS.map((r) => (
              <th key={r} className="border p-2 font-medium text-center w-28">
                {RISK_LABEL[r]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((cat) => (
            <tr key={cat}>
              <td className="border p-2 font-medium bg-muted/50">{CATEGORY_LABEL[cat]}</td>
              {RISK_RATINGS.map((r) => {
                const count = cellCount(cat, r);
                return (
                  <td key={r} className="border p-2 text-center">
                    {count > 0 ? (
                      <span
                        className={cn(
                          'inline-flex items-center justify-center rounded-full border w-8 h-8 text-xs font-semibold',
                          RISK_CELL_COLOR[r],
                        )}
                      >
                        {count}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
