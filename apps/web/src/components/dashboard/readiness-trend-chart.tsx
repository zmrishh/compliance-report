'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { useState } from 'react';

interface SnapshotPoint {
  snapshottedAt: string;
  score: number;
  passCount: number;
  failCount: number;
  totalCount: number;
}

interface Props {
  workspaceId: string;
}

export function ReadinessTrendChart({ workspaceId }: Props) {
  const [days, setDays] = useState('30');

  const { data: snapshots = [], isLoading } = useQuery<SnapshotPoint[]>({
    queryKey: ['readiness-snapshots', workspaceId, days],
    queryFn: () =>
      apiClient.get<SnapshotPoint[]>(`/workspaces/${workspaceId}/readiness/snapshots?days=${days}`),
  });

  const chartData = snapshots.map((s) => ({
    date: format(new Date(s.snapshottedAt), 'MMM d'),
    score: Math.round(s.score * 10) / 10,
    pass: s.passCount,
    fail: s.failCount,
  }));

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="font-medium text-sm">Readiness score over time</span>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : chartData.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No historical data yet. Scores are captured automatically after each evaluation.
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(value: number) => [`${value}%`, 'Score']}
                contentStyle={{
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#scoreGradient)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
