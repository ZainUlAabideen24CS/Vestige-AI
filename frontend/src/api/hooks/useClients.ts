import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../clients";
import type { Client, Project } from "../../types";

interface ListParams {
  q?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

export function useClients(params: ListParams) {
  return useQuery({
    queryKey: ["clients", params],
    queryFn: async () => {
      const res = await api.get<Client[]>("/clients", { params });
      return res.data;
    },
  });
}

export function useClient(id: number) {
  return useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const res = await api.get<Client>(`/clients/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useProjects(params: ListParams) {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: async () => {
      const res = await api.get<Project[]>("/projects", { params });
      return res.data;
    },
  });
}

export function useClientProjects(clientId: number) {
  return useQuery({
    queryKey: ["projects", { client_id: clientId }],
    queryFn: async () => {
      const res = await api.get<Project[]>("/projects", {
        params: { client_id: clientId, limit: 100 },
      });
      return res.data;
    },
    enabled: !!clientId,
  });
}

export interface ClientInput {
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  industry?: string;
  status?: string;
  notes?: string;
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ClientInput) => {
      const res = await api.post<Client>("/clients", input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateClient(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<ClientInput>) => {
      const res = await api.patch<Client>(`/clients/${id}`, input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", id] });
    },
  });
}

export interface ProjectInput {
  name: string;
  client_id: number;
  description?: string;
  status?: string;
  tech_stack?: string;
  start_date?: string;
  end_date?: string;
  budget?: string;
  manager_id?: number;
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      const res = await api.post<Project>("/projects", input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await api.get<Project>(`/projects/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useUpdateProject(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<ProjectInput>) => {
      const res = await api.patch<Project>(`/projects/${id}`, input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });
}

export interface ClientInput {
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  industry?: string;
  status?: string;
  notes?: string;
  account_manager_id?: number;
}