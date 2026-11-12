// status-service/src/types.ts
export type BackendStatus = 'operational' | 'maintenance' | 'issues';

export interface StatusData {
  backend_status: BackendStatus;
  message: string;
  estimated_duration?: string;
  started_at?: string;
  maintenance_type?: string;
  affected_services?: string[];
  last_updated: string;
}
