import { useQuery } from "@tanstack/react-query";
import { api } from "../clients";
import type { Delivery, Payment } from "../../types";

export function useDeliveries(projectId: number) {
  return useQuery({
    queryKey: ["deliveries", projectId],
    queryFn: async () => {
      const res = await api.get<Delivery[]>("/deliveries", {
        params: { project_id: projectId, limit: 50 },
      });
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function usePayments(projectId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["payments", projectId],
    queryFn: async () => {
      const res = await api.get<Payment[]>("/payments", {
        params: { project_id: projectId, limit: 50 },
      });
      return res.data;
    },
    enabled: enabled && !!projectId,
  });
}