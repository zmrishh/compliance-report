'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ControlStateWithControl } from '@/types/readiness';

const STATUS_CONFIG = {
  PASS: {
    icon: CheckCircle2,
    colour: 'text-green-600 dark:text-green-400',
    label: 'Pass',
  },
  FAIL: {
    icon: XCircle,
    colour: 'text-red-600 dark:text-red-400',
    label: 'Fail',
  },
  UNKNOWN: {
    icon: HelpCircle,
    colour: 'text-yellow-600 dark:text-yellow-400',
    label: 'Unknown',
  },
  WAIVED: {
    icon: MinusCircle,
    colour: 'text-muted-foreground',
    label: 'Waived',
  },
} as const;

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

type SortKey = 'severity' | 'status' | 'title';
type StatusFilter = 'ALL' | 'PASS' | 'FAIL' | 'UNKNOWN' | 'WAIVED';

export function ControlTable({
  controls,
  workspaceId,
  token,
  onUpdate,
}: {
  controls: ControlStateWithControl[];
  workspaceId: string;
  token: string;
  onUpdate: () => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('severity');
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = controls
    .filter((c) => {
      const matchesSearch =
        !search ||
        c.control.title.toLowerCase().includes(search.toLowerCase()) ||
        c.control.controlId.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'severity') {
        cmp =
          (SEVERITY_ORDER[a.control.severity as keyof typeof SEVERITY_ORDER] ?? 99) -
          (SEVERITY_ORDER[b.control.severity as keyof typeof SEVERITY_ORDER] ?? 99);
      } else if (sortKey === 'status') {
        cmp = a.status.localeCompare(b.status);
      } else {
        cmp = a.control.title.localeCompare(b.control.title);
      }
      return sortAsc ? cmp : -cmp;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-base">Controls ({filtered.length})</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Search controls…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48"
            />
            {(['ALL', 'PASS', 'FAIL', 'UNKNOWN', 'WAIVED'] as StatusFilter[]).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setStatusFilter(s)}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-foreground">
                    Status
                    {sortKey === 'status' && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  <button onClick={() => toggleSort('title')} className="flex items-center gap-1 hover:text-foreground">
                    Control
                    {sortKey === 'title' && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">
                  <button onClick={() => toggleSort('severity')} className="flex items-center gap-1 hover:text-foreground">
                    Severity
                    {sortKey === 'severity' && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-32">Last checked</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((control) => (
                <ControlRow
                  key={control.id}
                  control={control}
                  expanded={expandedId === control.id}
                  onToggle={() => setExpandedId(expandedId === control.id ? null : control.id)}
                  workspaceId={workspaceId}
                  token={token}
                  onUpdate={onUpdate}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No controls match your filters.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ControlRow({
  control,
  expanded,
  onToggle,
  workspaceId,
  token,
  onUpdate,
}: {
  control: ControlStateWithControl;
  expanded: boolean;
  onToggle: () => void;
  workspaceId: string;
  token: string;
  onUpdate: () => void;
}) {
  const config = STATUS_CONFIG[control.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.UNKNOWN;
  const Icon = config.icon;

  const SEVERITY_BADGE: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <>
      <tr
        className="border-b border-border hover:bg-muted/30 cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Icon className={`h-4 w-4 ${config.colour}`} />
            <span className={`text-xs font-medium ${config.colour}`}>{config.label}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium">{control.control.title}</div>
          <div className="text-xs text-muted-foreground">{control.control.controlId}</div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SEVERITY_BADGE[control.control.severity] ?? ''}`}
          >
            {control.control.severity}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {control.lastEvaluatedAt
            ? new Date(control.lastEvaluatedAt).toLocaleDateString()
            : '—'}
        </td>
        <td className="px-4 py-3">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-muted/10">
          <td colSpan={5} className="px-6 py-4">
            <div className="space-y-3">
              {control.detail && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Finding</p>
                  <p className="text-sm">{control.detail}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{control.control.description}</p>
              </div>
              {control.status === 'FAIL' && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Remediation</p>
                  <p className="text-sm text-muted-foreground">{control.control.remediationGuidance}</p>
                </div>
              )}
              {control.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{control.notes}</p>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Evidence sources:</span>
                {control.control.evidenceSources.map((s) => (
                  <code key={s} className="bg-muted px-1.5 py-0.5 rounded text-xs">{s}</code>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
