import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "../clients";

import type {
  Delivery,
  Payment,
  ProjectMember,
} from "../../types";


// ============================================================
// DELIVERIES
// ============================================================

export function useDeliveries(
  projectId: number
) {

  return useQuery({
    queryKey: [
      "deliveries",
      projectId,
    ],

    queryFn: async () => {

      const res =
        await api.get<Delivery[]>(
          "/deliveries",
          {
            params: {
              project_id: projectId,
              limit: 50,
            },
          }
        );

      return res.data;
    },

    enabled: !!projectId,
  });
}


export interface DeliveryInput {
  project_id: number;
  title: string;
  description?: string;
  status?: string;
  due_date?: string;
}


export function useCreateDelivery(
  projectId: number
) {

  const qc =
    useQueryClient();

  return useMutation({

    mutationFn: async (
      input: DeliveryInput
    ) => (
      await api.post(
        "/deliveries",
        input
      )
    ).data,

    onSuccess: () => {

      qc.invalidateQueries({
        queryKey: [
          "deliveries",
          projectId,
        ],
      });
    },
  });
}


export function useUpdateDelivery(
  projectId: number
) {

  const qc =
    useQueryClient();

  return useMutation({

    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: string;
    }) => (
      await api.patch(
        `/deliveries/${id}`,
        {
          status,
        }
      )
    ).data,

    onSuccess: () => {

      qc.invalidateQueries({
        queryKey: [
          "deliveries",
          projectId,
        ],
      });
    },
  });
}


// ============================================================
// PAYMENTS
// ============================================================

export function usePayments(
  projectId: number,
  enabled: boolean
) {

  return useQuery({
    queryKey: [
      "payments",
      projectId,
    ],

    queryFn: async () => {

      const res =
        await api.get<Payment[]>(
          "/payments",
          {
            params: {
              project_id: projectId,
              limit: 50,
            },
          }
        );

      return res.data;
    },

    enabled:
      enabled &&
      !!projectId,
  });
}


export interface PaymentInput {
  project_id: number;
  amount: number;
  currency?: string;
  status?: string;
  due_date?: string;
  invoice_number?: string;
}


export function useCreatePayment(
  projectId: number
) {

  const qc =
    useQueryClient();

  return useMutation({

    mutationFn: async (
      input: PaymentInput
    ) => (
      await api.post(
        "/payments",
        input
      )
    ).data,

    onSuccess: () => {

      qc.invalidateQueries({
        queryKey: [
          "payments",
          projectId,
        ],
      });
    },
  });
}


export function useUpdatePayment(
  projectId: number
) {

  const qc =
    useQueryClient();

  return useMutation({

    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: string;
    }) => (
      await api.patch(
        `/payments/${id}`,
        {
          status,
        }
      )
    ).data,

    onSuccess: () => {

      qc.invalidateQueries({
        queryKey: [
          "payments",
          projectId,
        ],
      });
    },
  });
}


// ============================================================
// PROJECT MEMBERS
// ============================================================

export interface ProjectMembersResponse {
  project_id: number;
  manager_id: number | null;
  can_manage_members: boolean;
  members: ProjectMember[];
}


export function useProjectMembers(
  projectId: number
) {

  return useQuery({
    queryKey: [
      "project-members",
      projectId,
    ],

    queryFn: async () => {

      const res =
        await api.get<ProjectMembersResponse>(
          `/projects/${projectId}/members`
        );

      return res.data;
    },

    enabled: !!projectId,
  });
}


// ============================================================
// ADD PROJECT MEMBER
// ============================================================

export function useAddProjectMember(
  projectId: number
) {

  const qc =
    useQueryClient();

  return useMutation({

    mutationFn: async (
      userId: number
    ) => (
      await api.post(
        `/projects/${projectId}/members`,
        {
          user_id: userId,
        }
      )
    ).data,

    onSuccess: () => {

      qc.invalidateQueries({
        queryKey: [
          "project-members",
          projectId,
        ],
      });

      qc.invalidateQueries({
        queryKey: ["projects"],
      });
    },
  });
}


// ============================================================
// REMOVE PROJECT MEMBER
// ============================================================

export function useRemoveProjectMember(
  projectId: number
) {

  const qc =
    useQueryClient();

  return useMutation({

    mutationFn: async (
      userId: number
    ) => (
      await api.delete(
        `/projects/${projectId}/members/${userId}`
      )
    ).data,

    onSuccess: () => {

      qc.invalidateQueries({
        queryKey: [
          "project-members",
          projectId,
        ],
      });

      qc.invalidateQueries({
        queryKey: ["projects"],
      });
    },
  });
}