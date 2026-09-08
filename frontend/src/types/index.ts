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


export interface ProjectMember {
  membership_id: number | null;
  user_id: number;
  full_name: string;
  email: string;
  role_on_project: string;
  assigned_at: string | null;
}


export interface IngestionJob {
  id: number;
  job_type: string;
  status: string;
  progress: number;
  document_id: number | null;
  meeting_id: number | null;
  created_by: number | null;

  // NEW
  created_by_name: string | null;

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

  // NEW
  uploaded_by_name: string | null;

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


export interface AskResponse {
  question: string;
  answer: string;
  sources: SearchHit[];
}


export interface WorkLog {
  id: number;
  project_id: number;
  user_id: number;
  log_date: string;
  summary: string;
  hours: string | null;
  technologies: string | null;
  blockers: string | null;
  user_name: string | null;
  project_name: string | null;
  created_at: string;
}


export interface Delivery {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  delivered_at: string | null;
  created_at: string;
}


export interface Payment {
  id: number;
  project_id: number;
  amount: string;
  currency: string;
  status: string;
  due_date: string | null;
  invoice_number: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Meeting {
  id: number;
  title: string;
  project_id: number | null;
  client_id: number | null;
  duration_seconds: number | null;
  participants: string | null;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}