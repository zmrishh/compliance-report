export type AwsAuthType = 'role' | 'keys';

export interface AwsRoleCredentials {
  type: 'role';
  roleArn: string;
  externalId?: string;
}

export interface AwsKeyCredentials {
  type: 'keys';
  accessKeyId: string;
  secretAccessKey: string;
}

export type AwsCredentials = AwsRoleCredentials | AwsKeyCredentials;

export interface AwsConfig {
  region: string;
  accountId?: string;
  endpoint?: string;
}
