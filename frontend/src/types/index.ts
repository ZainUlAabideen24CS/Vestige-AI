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