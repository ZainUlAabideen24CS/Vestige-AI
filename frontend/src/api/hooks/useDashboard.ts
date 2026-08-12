import { useQuery } from "@tanstack/react-query";
import { api } from "../clients";

interface Stats {
  clients: number;
  active_clients: number;
  projects: number;
  project_status: Record<string, number>;
  documents: number;
  meetings: number;
  chunks: number;
  recent_projects: { id: number; name: string; status: string; client_id: number }[];
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await api.get<Stats>("/dashboard/stats");
      return res.data;
    },
  });
}