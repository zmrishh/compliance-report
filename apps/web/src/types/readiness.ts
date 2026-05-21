export interface ReadinessSummary {
  workspaceId: string;
  score: number;
  updatedAt: string | null;
  breakdown: {
    pass: number;
    fail: number;
    unknown: number;
    waived: number;
  };
  topFailures: Array<{
    controlId: string;
    title: string;
    severity: string;
    detail: string | null;
    remediationGuidance: string;
  }>;
}

export interface ControlStateWithControl {
  id: string;
  workspaceId: string;
  controlId: string;
  status: string;
  ownerId: string | null;
  lastEvaluatedAt: string | null;
  detail: string | null;
  notes: string | null;
  waivedAt: string | null;
  evidenceIds: string[];
  control: {
    controlId: string;
    title: string;
    description: string;
    severity: string;
    remediationGuidance: string;
    evidenceSources: string[];
  };
}
