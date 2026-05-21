'use client';

import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ReadinessSummary } from '@/types/readiness';

const SEVERITY_COLOURS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export function FailedControlsPanel({
  failures,
}: {
  failures: ReadinessSummary['topFailures'];
}) {
  if (failures.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Top failures to address
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {failures.map((f) => (
          <div key={f.controlId} className="border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SEVERITY_COLOURS[f.severity] ?? ''}`}>
                  {f.severity}
                </span>
                <span className="font-medium text-sm">{f.title}</span>
              </div>
            </div>
            {f.detail && (
              <p className="text-sm text-muted-foreground">{f.detail}</p>
            )}
            <div className="pt-1">
              <p className="text-xs text-muted-foreground font-medium mb-1">Remediation</p>
              <p className="text-xs text-muted-foreground">{f.remediationGuidance}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
