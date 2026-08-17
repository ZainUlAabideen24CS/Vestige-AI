import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../clients";
import type { User } from "../../types";

export function useUsers(role?: string) {
  return useQuery({
    queryKey: ["users", role],
    queryFn: async () => {
      const res = await api.get<User[]>("/users", { params: role ? { role } : {} });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) =>
      (await api.patch<User>(`/users/${id}/role`, { role })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}