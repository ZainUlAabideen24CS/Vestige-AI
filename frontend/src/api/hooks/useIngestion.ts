import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "../clients";

import type {
  IngestionJob,
  Document,
} from "../../types";

import type {
  SearchResponse,
  AskResponse,
} from "../../types";


export function useAsk() {
  return useMutation({
    mutationFn: async (
      args: {
        question: string;
        clientId?: number;
      }
    ) => {
      const res = await api.post<AskResponse>(
        "/search/ask",
        {
          question: args.question,
          client_id: args.clientId,
        },
        {
          timeout: 180000,
        }
      );

      return res.data;
    },
  });
}


export function useSearch(
  query: string,
  clientId?: number
) {
  return useQuery({
    queryKey: [
      "search",
      query,
      clientId,
    ],

    queryFn: async () => {
      const res = await api.get<SearchResponse>(
        "/search",
        {
          params: {
            q: query,
            limit: 4,
            client_id: clientId,
          },
        }
      );

      return res.data;
    },

    enabled:
      query.trim().length >= 3,

    staleTime: 60_000,
  });
}


// ============================================================
// JOBS
// ============================================================

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],

    queryFn: async () => {
      const res = await api.get<IngestionJob[]>(
        "/ingest/jobs",
        {
          params: {
            limit: 20,
          },
        }
      );

      return res.data;
    },

    refetchInterval: (
      query
    ) => {
      const jobs =
        query.state.data;

      const active =
        jobs?.some(
          (job) =>
            job.status === "pending" ||
            job.status === "processing"
        );

      return active
        ? 2000
        : false;
    },
  });
}


// ============================================================
// DOCUMENT UPLOAD
// ============================================================

interface UploadArgs {
  file: File;
  sourceType: string;
  projectId?: number;
  clientId?: number;
}


export function useUpload() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      sourceType,
      projectId,
      clientId,
    }: UploadArgs) => {

      const form =
        new FormData();

      form.append(
        "file",
        file
      );

      form.append(
        "source_type",
        sourceType
      );

      if (
        projectId !== undefined
      ) {
        form.append(
          "project_id",
          String(projectId)
        );
      }

      if (
        clientId !== undefined
      ) {
        form.append(
          "client_id",
          String(clientId)
        );
      }

      const res =
        await api.post<IngestionJob>(
          "/ingest/upload",
          form
        );

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["jobs"],
      });

      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });

      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });
}


// ============================================================
// AUDIO UPLOAD
// ============================================================

interface UploadAudioArgs {
  file: File;
  title: string;
  projectId?: number;
  clientId?: number;
}


export function useUploadAudio() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      title,
      projectId,
      clientId,
    }: UploadAudioArgs) => {

      const form =
        new FormData();

      form.append(
        "file",
        file
      );

      form.append(
        "title",
        title
      );

      if (
        projectId !== undefined
      ) {
        form.append(
          "project_id",
          String(projectId)
        );
      }

      if (
        clientId !== undefined
      ) {
        form.append(
          "client_id",
          String(clientId)
        );
      }

      const res =
        await api.post<IngestionJob>(
          "/ingest/audio",
          form
        );

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["jobs"],
      });

      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });

      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });
}


// ============================================================
// DOCUMENTS
// ============================================================

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],

    queryFn: async () => {
      const res =
        await api.get<Document[]>(
          "/ingest/documents",
          {
            params: {
              limit: 50,
            },
          }
        );

      return res.data;
    },

    refetchInterval: 3000,
  });
}