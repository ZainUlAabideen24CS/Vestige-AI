import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../clients";
import type { WorkLog } from "../../types";

interface Params {
  project_id?: number;
  user_id?: number;
  skip?: number;
  limit?: number;
}

export interface WorkLogInput {
  project_id: number;
  log_date: string;
  summary: string;
  hours?: number;
  technologies?: string;
  blockers?: string;
}

export function useWorkLogs(params: Params) {
  return useQuery({
    queryKey: ["worklogs", params],
    queryFn: async () => {
      const res = await api.get<WorkLog[]>("/worklogs", { params });
      return res.data;
    },
  });
}

export function useCreateWorkLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WorkLogInput) => {
      const res = await api.post<WorkLog>("/worklogs", input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worklogs"] });
    },
  });
}