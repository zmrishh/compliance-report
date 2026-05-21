'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { BarChart3, BookOpen, Building2, ClipboardList, Plug, Webhook, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WorkspaceSidebarNav() {
  const params = useParams();
  const pathname = usePathname();
  const workspaceId = params['workspaceId'] as string | undefined;

  if (!workspaceId) return null;

  const links = [
    { href: `/workspaces/${workspaceId}/readiness`, label: 'Readiness', icon: BarChart3 },
    { href: `/workspaces/${workspaceId}/policies`, label: 'Policies', icon: BookOpen },
    { href: `/workspaces/${workspaceId}/access-reviews`, label: 'Access Reviews', icon: ClipboardList },
    { href: `/workspaces/${workspaceId}/settings/connectors`, label: 'Connectors', icon: Plug },
    { href: `/workspaces/${workspaceId}/settings/integrations`, label: 'Integrations', icon: Zap },
    { href: `/workspaces/${workspaceId}/settings/webhooks`, label: 'Webhooks', icon: Webhook },
    { href: `/org/vendors`, label: 'Vendors', icon: Building2 },
  ];

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="px-3 text-xs text-muted-foreground mb-1 font-medium">Current workspace</p>
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
            pathname === href
              ? 'bg-accent text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </div>
  );
}
