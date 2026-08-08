import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../clients";
import type { IngestionJob, Document } from "../../types";
import type { SearchResponse } from "../../types";

export function useSearch(query: string, clientId?: number) {
  return useQuery({
    queryKey: ["search", query, clientId],
    queryFn: async () => {
      const res = await api.get<SearchResponse>("/search", {
        params: { q: query, limit: 8, client_id: clientId },
      });
      return res.data;
    },
    enabled: query.trim().length >= 3,
    staleTime: 60_000,
  });
}

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const res = await api.get<IngestionJob[]>("/ingest/jobs", { params: { limit: 20 } });
      return res.data;
    },
    refetchInterval: (query) => {
      const jobs = query.state.data;
      const active = jobs?.some((j) => j.status === "pending" || j.status === "processing");
      return active ? 2000 : false;
    },
  });
}



interface UploadArgs {
  file: File;
  sourceType: string;
  projectId?: number;
  clientId?: number;
}

export function useUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, sourceType, projectId, clientId }: UploadArgs) => {
      const form = new FormData();
      form.append("file", file);
      form.append("source_type", sourceType);
      if (projectId) form.append("project_id", String(projectId));
      if (clientId) form.append("client_id", String(clientId));

      const res = await api.post<IngestionJob>("/ingest/upload", form);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await api.get<Document[]>("/ingest/documents", { params: { limit: 50 } });
      return res.data;
    },
    refetchInterval: 3000,
  });
}