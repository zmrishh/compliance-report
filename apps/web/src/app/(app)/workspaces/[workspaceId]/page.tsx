import { redirect } from 'next/navigation';

export default function WorkspaceHomePage({ params }: { params: { workspaceId: string } }) {
  redirect(`/workspaces/${params.workspaceId}/readiness`);
}
