import { useQuery } from "@tanstack/react-query";
import { api } from "../clients";
import type { User } from "../../types";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get<User>("/auth/me");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}