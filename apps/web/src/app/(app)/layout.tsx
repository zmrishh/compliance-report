import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { LayoutDashboard, Shield, Settings, LogOut } from 'lucide-react';

import { ThemeToggle } from '@/components/ui/theme-toggle';
import { WorkspaceSidebarNav } from '@/components/workspaces/workspace-sidebar-nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Compliance</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Readiness Platform</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link
            href="/workspaces"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            All workspaces
          </Link>
          <WorkspaceSidebarNav />
        </nav>

        <div className="p-4 border-t border-border space-y-2 shrink-0">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              {user.email}
            </span>
            <ThemeToggle />
          </div>
          <Link
            href="/auth/sign-out"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
