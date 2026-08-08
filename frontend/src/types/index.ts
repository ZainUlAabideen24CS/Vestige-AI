export interface Client {
  id: number;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  industry: string | null;
  status: string;
  notes: string | null;
  lead_id: number | null;
  account_manager_id: number | null;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: string;
  tech_stack: string | null;
  start_date: string | null;
  end_date: string | null;
  budget?: string | null;
  client_id: number;
  manager_id: number | null;
  created_at: string;
}

export interface IngestionJob {
  id: number;
  job_type: string;
  status: string;
  progress: number;
  document_id: number | null;
  meeting_id: number | null;
  created_by: number | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface Document {
  id: number;
  filename: string;
  source_type: string;
  project_id: number | null;
  client_id: number | null;
  uploaded_by: number | null;
  summary: string | null;
  chunk_count: number;
  created_at: string;
}

export interface SearchHit {
  text: string;
  document_id: number | null;
  chunk_index: number | null;
  client_id: number | null;
  project_id: number | null;
  filename: string | null;
  score: number;
}

export interface SearchResponse {
  query: string;
  hits: SearchHit[];
}