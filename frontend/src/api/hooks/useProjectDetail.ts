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

// ============================================================
// CREATE DELIVERY
// ============================================================

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
    ) => {
      const res =
        await api.post<Delivery>(
          "/deliveries",
          input
        );

      return res.data;
    },

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
// UPDATE DELIVERY
// ============================================================

export interface DeliveryUpdateInput {
  id: number;
  status?: string;
  title?: string;
  description?: string;
  due_date?: string;
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
      title,
      description,
      due_date,
    }: DeliveryUpdateInput) => {
      const res =
        await api.patch<Delivery>(
          `/deliveries/${id}`,
          {
            ...(status !== undefined && {
              status,
            }),

            ...(title !== undefined && {
              title,
            }),

            ...(description !== undefined && {
              description,
            }),

            ...(due_date !== undefined && {
              due_date,
            }),
          }
        );

      return res.data;
    },

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
// DELETE DELIVERY
// ============================================================

export function useDeleteDelivery(
  projectId: number
) {
  const qc =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      deliveryId: number
    ) => {
      await api.delete(
        `/deliveries/${deliveryId}`
      );
    },

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [
          "deliveries",
          projectId,
        ],
      });
    },
  });
};

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

// ============================================================
// CREATE PAYMENT
// ============================================================

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
    ) => {
      const res =
        await api.post<Payment>(
          "/payments",
          input
        );

      return res.data;
    },

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
// UPDATE PAYMENT
// ============================================================

export interface PaymentUpdateInput {
  id: number;
  status?: string;
  amount?: number;
  currency?: string;
  due_date?: string;
  invoice_number?: string;
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
      amount,
      currency,
      due_date,
      invoice_number,
    }: PaymentUpdateInput) => {
      const res =
        await api.patch<Payment>(
          `/payments/${id}`,
          {
            ...(status !== undefined && {
              status,
            }),

            ...(amount !== undefined && {
              amount,
            }),

            ...(currency !== undefined && {
              currency,
            }),

            ...(due_date !== undefined && {
              due_date,
            }),

            ...(invoice_number !== undefined && {
              invoice_number,
            }),
          }
        );

      return res.data;
    },

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
// DELETE PAYMENT
// ============================================================

export function useDeletePayment(
  projectId: number
) {
  const qc =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      paymentId: number
    ) => {
      await api.delete(
        `/payments/${paymentId}`
      );
    },

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
    ) => {
      const res =
        await api.post(
          `/projects/${projectId}/members`,
          {
            user_id: userId,
          }
        );

      return res.data;
    },

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
    ) => {
      const res =
        await api.delete(
          `/projects/${projectId}/members/${userId}`
        );

      return res.data;
    },

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