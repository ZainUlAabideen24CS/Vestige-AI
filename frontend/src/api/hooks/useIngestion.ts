import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "../clients";

import type {
  IngestionJob,
  Document,
  Meeting,
  SearchResponse,
  AskResponse,
} from "../../types";

// ============================================================
// ASK
// ============================================================

export function useAsk() {
  return useMutation({
    mutationFn: async (args: {
      question: string;
      clientId?: number;
      projectId?: number;
    }) => {
      const res = await api.post<AskResponse>("/search/ask", {
        question: args.question,
        client_id: args.clientId,
        project_id: args.projectId,
      });

      return res.data;
    },
  });
}

// ============================================================
// SEARCH
// ============================================================

export function useSearch(
  query: string,
  clientId?: number,
  projectId?: number
) {
  return useQuery({
    queryKey: [
      "search",
      query,
      clientId,
      projectId,
    ],

    queryFn: async () => {
      const res = await api.get<SearchResponse>(
        "/search",
        {
          params: {
            q: query,
            limit: 10,
            client_id: clientId,
            project_id: projectId,
          },
        }
      );

      return res.data;
    },

    enabled: query.trim().length >= 3,

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

    refetchInterval: (query) => {
      const jobs = query.state.data;

      const active = jobs?.some(
        (job) =>
          job.status === "pending" ||
          job.status === "processing"
      );

      return active ? 2000 : false;
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      sourceType,
      projectId,
      clientId,
    }: UploadArgs) => {
      const form = new FormData();

      form.append("file", file);

      form.append(
        "source_type",
        sourceType
      );

      if (projectId !== undefined) {
        form.append(
          "project_id",
          String(projectId)
        );
      }

      if (clientId !== undefined) {
        form.append(
          "client_id",
          String(clientId)
        );
      }

      /*
       * IMPORTANT:
       *
       * This request must successfully finish before
       * onSuccess runs.
       *
       * If the backend returns an error, this mutation
       * goes to onError and documents are NOT refreshed.
       */
      const res = await api.post<IngestionJob>(
        "/ingest/upload",
        form
      );

      return res.data;
    },

    /*
     * IMPORTANT:
     *
     * Documents are refreshed ONLY after successful
     * upload response.
     *
     * There is NO optimistic document insertion.
     */
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["jobs"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["documents"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });
}

// ============================================================
// AUDIO / MEETING UPLOAD
// ============================================================

interface UploadAudioArgs {
  file: File;
  title: string;
  participants?: string;
  projectId?: number;
  clientId?: number;
}

export function useUploadAudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      title,
      participants,
      projectId,
      clientId,
    }: UploadAudioArgs) => {
      const form = new FormData();

      form.append(
        "file",
        file
      );

      form.append(
        "title",
        title
      );

      if (participants) {
        form.append(
          "participants",
          participants
        );
      }

      if (projectId !== undefined) {
        form.append(
          "project_id",
          String(projectId)
        );
      }

      if (clientId !== undefined) {
        form.append(
          "client_id",
          String(clientId)
        );
      }

      /*
       * 5 minutes timeout.
       *
       * The request must successfully finish before
       * onSuccess runs.
       *
       * If upload/conversion fails, mutation fails and
       * meetings query is NOT invalidated.
       */
      const res = await api.post<IngestionJob>(
        "/ingest/audio",
        form,
        {
          timeout: 300000,
        }
      );

      return res.data;
    },

    /*
     * IMPORTANT:
     *
     * Only after successful meeting upload:
     *
     * 1. Refresh jobs
     * 2. Refresh meetings
     * 3. Refresh dashboard
     *
     * There is NO optimistic meeting insertion.
     */
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["jobs"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["meetings"],
      });

      await queryClient.invalidateQueries({
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
      const res = await api.get<Document[]>(
        "/ingest/documents",
        {
          params: {
            limit: 50,
          },
        }
      );

      return res.data;
    },

    /*
     * Keep refreshing because document processing
     * can update chunk_count / summary after upload.
     */
    refetchInterval: 3000,
  });
}

// ============================================================
// MEETINGS
// ============================================================

export function useMeetings() {
  return useQuery({
    queryKey: ["meetings"],

    queryFn: async () => {
      const res = await api.get<Meeting[]>(
        "/ingest/meetings",
        {
          params: {
            limit: 50,
          },
        }
      );

      return res.data;
    },

    /*
     * This is also important for speaker names.
     *
     * Initially:
     *   participants = manually entered participants
     *
     * After transcription:
     *   participants = detected speaker names
     *
     * Because this endpoint is refreshed every 3 seconds,
     * the UI will automatically show the detected names.
     */
    refetchInterval: 3000,
  });
}

// ============================================================
// SINGLE DOCUMENT
// ============================================================

export function useDocumentDetail(
  id: number | null
) {
  return useQuery({
    queryKey: [
      "document",
      id,
    ],

    queryFn: async () => {
      const res = await api.get<Document>(
        `/ingest/documents/${id}`
      );

      return res.data;
    },

    enabled: !!id,
  });
}

// ============================================================
// SINGLE MEETING
// ============================================================

export function useMeetingDetail(
  id: number | null
) {
  return useQuery({
    queryKey: [
      "meeting",
      id,
    ],

    queryFn: async () => {
      const res = await api.get<Meeting>(
        `/ingest/meetings/${id}`
      );

      return res.data;
    },

    enabled: !!id,

    /*
     * Meeting processing happens in the background.
     *
     * This keeps the opened meeting detail updated
     * while transcription/summary processing continues.
     */
    refetchInterval: 3000,
  });
}