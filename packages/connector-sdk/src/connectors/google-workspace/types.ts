export interface GoogleWorkspaceCredentials {
  type: 'service_account';
  clientEmail: string;
  privateKey: string;
  /** Super Admin email to impersonate for Directory API access */
  impersonateEmail: string;
}

export interface GoogleWorkspaceConfig {
  domain: string;
}
