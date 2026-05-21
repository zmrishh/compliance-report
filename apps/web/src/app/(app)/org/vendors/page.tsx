'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Building2,
  Plus,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { RiskHeatmap } from '@/components/vendors/risk-heatmap';
import { apiClient } from '@/lib/api-client';

const RISK_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'secondary',
  low: 'default',
};

const RISK_LABEL: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

interface VendorRow {
  id: string;
  name: string;
  website: string | null;
  category: string;
  riskRating: string;
  reviewCycleDays: number;
  lastReviewedAt: string | null;
  deletedAt: string | null;
}

const EMPTY_FORM = {
  name: '',
  website: '',
  category: 'saas',
  riskRating: 'medium',
  reviewCycleDays: 365,
  notes: '',
};

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [isNewOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);

  const { data: vendors = [], isLoading } = useQuery<VendorRow[]>({
    queryKey: ['vendors'],
    queryFn: () => apiClient.get<VendorRow[]>('/vendors'),
  });

  const { data: dueForReview = [] } = useQuery<VendorRow[]>({
    queryKey: ['vendors-due'],
    queryFn: () => apiClient.get<VendorRow[]>('/vendors/due-for-review'),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof EMPTY_FORM) =>
      apiClient.post('/vendors', body),
    onSuccess: () => {
      setNewOpen(false);
      setForm(EMPTY_FORM);
      void queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (vendorId: string) =>
      apiClient.delete(`/vendors/${vendorId}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['vendors'] }),
  });

  const markReviewedMutation = useMutation({
    mutationFn: (vendorId: string) =>
      apiClient.patch(`/vendors/${vendorId}`, { lastReviewedAt: new Date().toISOString() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vendors'] });
      void queryClient.invalidateQueries({ queryKey: ['vendors-due'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Vendor Risk Register</h1>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add vendor
        </Button>
      </div>

      {dueForReview.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{dueForReview.length} vendor{dueForReview.length > 1 ? 's are' : ' is'} due for review.</strong>{' '}
            {dueForReview.slice(0, 3).map((v) => v.name).join(', ')}
            {dueForReview.length > 3 && ` and ${dueForReview.length - 3} more`}.
          </p>
        </div>
      )}

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Vendors ({vendors.length})</TabsTrigger>
          <TabsTrigger value="heatmap">Risk Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {isLoading && (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
          )}
          {!isLoading && vendors.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No vendors registered yet.</p>
            </div>
          )}
          {vendors.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Risk rating</TableHead>
                    <TableHead>Last reviewed</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{v.name}</p>
                          {v.website && (
                            <a
                              href={v.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:underline"
                            >
                              {v.website}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-sm">{v.category}</TableCell>
                      <TableCell>
                        <Badge variant={RISK_VARIANT[v.riskRating] ?? 'outline'} className="text-xs">
                          {RISK_LABEL[v.riskRating] ?? v.riskRating}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.lastReviewedAt
                          ? format(new Date(v.lastReviewedAt), 'MMM d, yyyy')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => markReviewedMutation.mutate(v.id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as reviewed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(v.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="heatmap" className="mt-4">
          <div className="rounded-lg border p-6">
            <RiskHeatmap vendors={vendors} />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isNewOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Datadog"
              />
            </div>
            <div className="grid gap-2">
              <Label>Website (optional)</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="payments">Payments</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Risk rating</Label>
                <Select
                  value={form.riskRating}
                  onValueChange={(v) => setForm((f) => ({ ...f, riskRating: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Review cycle (days)</Label>
              <Input
                type="number"
                min={30}
                max={730}
                value={form.reviewCycleDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reviewCycleDays: parseInt(e.target.value, 10) || 365 }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Data processing agreement status, risk summary…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.name || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? 'Adding…' : 'Add vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
