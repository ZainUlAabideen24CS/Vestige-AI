import { useQuery } from "@tanstack/react-query";
import { api } from "../clients";
import type { Client, Project } from "../../types";

interface Params {
  q?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

export function useClients(params: Params) {
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