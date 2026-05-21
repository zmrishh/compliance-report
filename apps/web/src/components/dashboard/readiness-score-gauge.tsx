'use client';

import type { ReadinessSummary } from '@/types/readiness';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getScoreColour(score: number): string {
  if (score >= 75) return '#22c55e'; // green-500
  if (score >= 40) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
}

function getScoreLabel(score: number): string {
  if (score >= 75) return 'On track';
  if (score >= 40) return 'In progress';
  return 'Needs work';
}

export function ReadinessScoreGauge({ summary }: { summary: ReadinessSummary | null }) {
  const score = summary?.score ?? 0;
  const colour = getScoreColour(score);
  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Readiness Score</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-6">
        <div className="relative">
          <svg width="160" height="160" viewBox="0 0 160 160">
            {/* Background track */}
            <circle
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="12"
            />
            {/* Score arc */}
            <circle
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              stroke={colour}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 80 80)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: colour }}>
              {Math.round(score)}%
            </span>
            <span className="text-xs text-muted-foreground mt-1">{getScoreLabel(score)}</span>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 gap-3 w-full mt-4">
            <StatusPill label="Pass" count={summary.breakdown.pass} colour="text-green-600 dark:text-green-400" />
            <StatusPill label="Fail" count={summary.breakdown.fail} colour="text-red-600 dark:text-red-400" />
            <StatusPill label="Unknown" count={summary.breakdown.unknown} colour="text-yellow-600 dark:text-yellow-400" />
            <StatusPill label="Waived" count={summary.breakdown.waived} colour="text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusPill({ label, count, colour }: { label: string; count: number; colour: string }) {
  return (
    <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
      <span className={`text-xl font-semibold ${colour}`}>{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
