import { useState } from "react";
import { useParams, Link } from "react-router-dom";

import {
  useProject,
  useUpdateProject,
  useClient,
} from "../api/hooks/useClients";

import { useCurrentUser } from "../api/hooks/useCurrentUser";
import { useWorkLogs } from "../api/hooks/useWorkLogs";
import { useUsers } from "../api/hooks/useUsers";

import {
  useDeliveries,
  usePayments,
  useCreateDelivery,
  useUpdateDelivery,
  useCreatePayment,
  useUpdatePayment,
  useProjectMembers,
  useAddProjectMember,
  useRemoveProjectMember,
} from "../api/hooks/useProjectDetail";

import DeliveryForm from "../components/DeliveryForm";
import PaymentForm from "../components/PaymentForm";
import Modal from "../components/Modal";
import ProjectForm from "../components/ProjectForm";

const statusStyles: Record<string, string> = {
  planning: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

const selectClass =
  "text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = Number(id);

  // ============================================================
  // MODALS
  // ============================================================

  const [showEdit, setShowEdit] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // ============================================================
  // CURRENT USER
  // ============================================================

  const { data: me } = useCurrentUser();

  // ============================================================
  // PROJECT
  // ============================================================

  const {
    data: project,
    isLoading,
    isError,
  } = useProject(projectId);

  // ============================================================
  // PROJECT PERMISSIONS
  // ============================================================

  const canEdit =
    me?.role === "admin" ||
    me?.role === "manager";

  const canSeeBudget = canEdit;

  // ============================================================
  // OTHER DATA
  // ============================================================

  const { data: client } = useClient(
    project?.client_id ?? 0
  );

  const { data: logs } = useWorkLogs({
    project_id: projectId,
    limit: 20,
  });

  const { data: deliveries } =
    useDeliveries(projectId);

  const { data: payments } =
    usePayments(
      projectId,
      canEdit
    );

  // ============================================================
  // PROJECT MEMBERS
  // ============================================================

  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersError,
  } = useProjectMembers(projectId);

  const members = membersData?.members ?? [];

  const canManageMembers =
    membersData?.can_manage_members ?? false;

  // ============================================================
  // USERS
  // ============================================================

  const {
    data: users,
    isLoading: usersLoading,
  } = useUsers();

  // ============================================================
  // MEMBER MUTATIONS
  // ============================================================

  const addMember =
    useAddProjectMember(projectId);

  const removeMember =
    useRemoveProjectMember(projectId);

  // ============================================================
  // OTHER MUTATIONS
  // ============================================================

  const updateProject =
    useUpdateProject(projectId);

  const createDelivery =
    useCreateDelivery(projectId);

  const updateDelivery =
    useUpdateDelivery(projectId);

  const createPayment =
    useCreatePayment(projectId);

  const updatePayment =
    useUpdatePayment(projectId);

  // ============================================================
  // LOCAL STATE
  // ============================================================

  const [selectedEmployee, setSelectedEmployee] =
    useState<number | "">("");

  // ============================================================
  // LOADING / ERROR
  // ============================================================

  if (isLoading) {
    return (
      <main className="w-full min-w-0 overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-3 py-6 sm:px-5 lg:px-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-7 w-64 bg-slate-200 rounded" />
              <div className="h-4 w-40 bg-slate-200 rounded" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="h-12 bg-slate-100 rounded-lg" />
                <div className="h-12 bg-slate-100 rounded-lg" />
                <div className="h-12 bg-slate-100 rounded-lg" />
                <div className="h-12 bg-slate-100 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isError || !project) {
    return (
      <main className="w-full min-w-0 overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-3 py-6 sm:px-5 lg:px-8">
          <div className="bg-white border border-red-200 rounded-xl p-6">
            <p className="text-sm text-red-600">
              Project not found.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ============================================================
  // ACTIVE MEMBER IDS
  // ============================================================

  const activeMemberIds = new Set(
    members.map(
      (member) => member.user_id
    )
  );

  // ============================================================
  // AVAILABLE EMPLOYEES
  // ============================================================

  const availableEmployees =
    (users ?? []).filter(
      (employee) =>
        employee.is_active &&
        !activeMemberIds.has(employee.id) &&
        employee.id !== project.manager_id
    );

  // ============================================================
  // ADD EMPLOYEE
  // ============================================================

  const handleAddEmployee = () => {
    if (
      !canManageMembers ||
      selectedEmployee === ""
    ) {
      return;
    }

    addMember.mutate(
      selectedEmployee,
      {
        onSuccess: () => {
          setSelectedEmployee("");
        },
      }
    );
  };

  // ============================================================
  // REMOVE EMPLOYEE
  // ============================================================

  const handleRemoveEmployee = (
    userId: number,
    fullName: string
  ) => {
    if (!canManageMembers) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${fullName} from this project?`
    );

    if (!confirmed) {
      return;
    }

    removeMember.mutate(userId);
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <main className="w-full min-w-0 overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

        {/* ======================================================
            BACK
        ====================================================== */}

        <Link
          to="/projects"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          ←
          <span className="ml-1">
            Back to projects
          </span>
        </Link>

        {/* ======================================================
            PROJECT INFORMATION
        ====================================================== */}

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="p-4 sm:p-6">

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">

              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 break-words">
                  {project.name}
                </h1>

                {client && (
                  <Link
                    to={`/clients/${client.id}`}
                    className="inline-block text-sm text-slate-500 hover:text-blue-600 mt-1 transition-colors break-words"
                  >
                    {client.company_name}
                  </Link>
                )}
              </div>

              {/* Status + Edit */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                    statusStyles[project.status] ??
                    "bg-slate-100 text-slate-700"
                  }`}
                >
                  {project.status}
                </span>

                {canEdit && (
                  <button
                    onClick={() =>
                      setShowEdit(true)
                    }
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Project Information */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 text-sm">

              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                  Tech stack
                </dt>

                <dd className="text-slate-900 break-words">
                  {project.tech_stack ?? "—"}
                </dd>
              </div>

              {canSeeBudget && (
                <div className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                    Budget
                  </dt>

                  <dd className="text-slate-900">
                    {project.budget
                      ? Number(
                          project.budget
                        ).toLocaleString()
                      : "—"}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                  Start date
                </dt>

                <dd className="text-slate-900">
                  {project.start_date ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                  End date
                </dt>

                <dd className="text-slate-900">
                  {project.end_date ?? "—"}
                </dd>
              </div>
            </dl>

            {/* Description */}
            {project.description && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                  Description
                </p>

                <p className="text-sm text-slate-700 leading-6 whitespace-pre-wrap break-words">
                  {project.description}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ======================================================
            TEAM MEMBERS
        ====================================================== */}

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 mb-6">

          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Team Members
              {members ? (
                <span className="ml-1 text-slate-500 font-normal">
                  ({members.length})
                </span>
              ) : null}
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Employees currently assigned to this project.
            </p>
          </div>

          {/* Member Error */}
          {membersError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
              Could not load project members.
            </div>
          )}

          {/* Member Loading */}
          {membersLoading && (
            <p className="text-sm text-slate-500">
              Loading team members...
            </p>
          )}

          {/* No Members */}
          {!membersLoading &&
            members.length === 0 && (
              <div className="border border-dashed border-slate-200 rounded-lg p-5 text-center">
                <p className="text-sm text-slate-500">
                  No team members assigned.
                </p>
              </div>
            )}

          {/* Member List */}
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="border border-slate-100 rounded-lg p-3 sm:p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  {/* User */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 break-words">
                      {member.full_name}
                    </p>

                    <p className="text-xs text-slate-500 mt-0.5 break-all">
                      {member.email}
                    </p>
                  </div>

                  {/* Role + Remove */}
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        member.role_on_project ===
                        "manager"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {member.role_on_project}
                    </span>

                    {canManageMembers &&
                      member.role_on_project !==
                        "manager" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveEmployee(
                              member.user_id,
                              member.full_name
                            )
                          }
                          disabled={
                            removeMember.isPending
                          }
                          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 whitespace-nowrap"
                        >
                          {removeMember.isPending
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ====================================================
              ADD EMPLOYEE
          ==================================================== */}

          {canManageMembers && (
            <div className="mt-6 pt-5 border-t border-slate-100">

              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Add employee
              </h3>

              {usersLoading ? (
                <p className="text-sm text-slate-500">
                  Loading employees...
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">

                  <select
                    value={selectedEmployee}
                    onChange={(e) =>
                      setSelectedEmployee(
                        e.target.value
                          ? Number(
                              e.target.value
                            )
                          : ""
                      )
                    }
                    className="w-full flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">
                      Select employee
                    </option>

                    {availableEmployees.map(
                      (employee) => (
                        <option
                          key={employee.id}
                          value={employee.id}
                        >
                          {employee.full_name} (
                          {employee.email})
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={
                      handleAddEmployee
                    }
                    disabled={
                      selectedEmployee === "" ||
                      addMember.isPending
                    }
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    {addMember.isPending
                      ? "Adding..."
                      : "Add"}
                  </button>
                </div>
              )}

              {availableEmployees.length ===
                0 &&
                !usersLoading && (
                  <p className="text-xs text-slate-500 mt-2">
                    No available employees to add.
                  </p>
                )}
            </div>
          )}
        </section>

        {/* ======================================================
            DELIVERIES + PAYMENTS
        ====================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

          {/* DELIVERIES */}
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5">

            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Deliveries
                {deliveries ? (
                  <span className="ml-1 text-slate-500 font-normal">
                    ({deliveries.length})
                  </span>
                ) : null}
              </h3>

              {canEdit && (
                <button
                  onClick={() =>
                    setShowDelivery(true)
                  }
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
                >
                  + Add
                </button>
              )}
            </div>

            {deliveries &&
              deliveries.length === 0 && (
                <p className="text-sm text-slate-500">
                  None yet.
                </p>
              )}

            <div className="space-y-3">
              {deliveries?.map((d) => (
                <div
                  key={d.id}
                  className="border border-slate-100 rounded-lg p-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 break-words">
                        {d.title}
                      </p>

                      <p className="text-xs text-slate-500 mt-0.5">
                        {d.due_date
                          ? `Due ${d.due_date}`
                          : "No due date"}
                      </p>
                    </div>

                    {canEdit ? (
                      <select
                        value={d.status}
                        onChange={(e) =>
                          updateDelivery.mutate({
                            id: d.id,
                            status:
                              e.target.value,
                          })
                        }
                        className={`${selectClass} w-full sm:w-auto`}
                      >
                        <option value="pending">
                          pending
                        </option>

                        <option value="in_progress">
                          in_progress
                        </option>

                        <option value="delivered">
                          delivered
                        </option>

                        <option value="accepted">
                          accepted
                        </option>
                      </select>
                    ) : (
                      <span
                        className={`self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          d.status ===
                            "accepted" ||
                          d.status ===
                            "delivered"
                            ? "bg-green-100 text-green-800"
                            : d.status ===
                              "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {d.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* PAYMENTS */}
          {canEdit && (
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5">

              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Payments
                  {payments ? (
                    <span className="ml-1 text-slate-500 font-normal">
                      ({payments.length})
                    </span>
                  ) : null}
                </h3>

                <button
                  onClick={() =>
                    setShowPayment(true)
                  }
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
                >
                  + Add
                </button>
              </div>

              {payments &&
                payments.length === 0 && (
                  <p className="text-sm text-slate-500">
                    None yet.
                  </p>
                )}

              <div className="space-y-3">
                {payments?.map((p) => (
                  <div
                    key={p.id}
                    className="border border-slate-100 rounded-lg p-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {p.currency}{" "}
                          {Number(
                            p.amount
                          ).toLocaleString()}
                        </p>

                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {p.invoice_number ??
                            "No invoice"}

                          {p.due_date &&
                            ` · due ${p.due_date}`}
                        </p>
                      </div>

                      <select
                        value={p.status}
                        onChange={(e) =>
                          updatePayment.mutate({
                            id: p.id,
                            status:
                              e.target.value,
                          })
                        }
                        className={`${selectClass} w-full sm:w-auto`}
                      >
                        <option value="pending">
                          pending
                        </option>

                        <option value="invoiced">
                          invoiced
                        </option>

                        <option value="paid">
                          paid
                        </option>

                        <option value="overdue">
                          overdue
                        </option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ======================================================
            WORK LOGS
        ====================================================== */}

        <div className="mb-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Work logs
            {logs ? (
              <span className="ml-1 text-slate-500 font-normal">
                ({logs.length})
              </span>
            ) : null}
          </h2>

          <p className="text-sm text-slate-500 mt-0.5">
            Recent activity recorded on this project.
          </p>
        </div>

        <div className="space-y-3">

          {logs &&
            logs.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <p className="text-sm text-slate-500">
                  Nothing logged on this project yet.
                </p>
              </div>
            )}

          {logs?.map((log) => (
            <article
              key={log.id}
              className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5"
            >

              {/* Log Header */}
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">

                <p className="text-sm font-semibold text-slate-900">
                  {log.user_name ??
                    "Unknown"}
                </p>

                <p className="text-xs text-slate-500">
                  {log.log_date}

                  {log.hours &&
                    ` · ${Number(
                      log.hours
                    )}h`}
                </p>
              </div>

              {/* Summary */}
              <p className="text-sm text-slate-700 leading-6 mb-3 break-words">
                {log.summary}
              </p>

              {/* Technologies */}
              {log.technologies && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {log.technologies
                    .split(",")
                    .map((t) => (
                      <span
                        key={t}
                        className="px-2 py-1 bg-slate-100 rounded-md text-xs text-slate-600"
                      >
                        {t.trim()}
                      </span>
                    ))}
                </div>
              )}

              {/* Blocker */}
              {log.blockers && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 break-words">
                  <span className="font-medium">
                    Blocked:
                  </span>{" "}
                  {log.blockers}
                </p>
              )}
            </article>
          ))}
        </div>

        {/* ======================================================
            EDIT PROJECT MODAL
        ====================================================== */}

        <Modal
          open={showEdit}
          title="Edit project"
          onClose={() =>
            setShowEdit(false)
          }
        >
          <ProjectForm
            initial={project}
            fixedClientId={
              project.client_id
            }
            submitting={
              updateProject.isPending
            }
            error={
              updateProject.isError
                ? "Could not save. Check the fields and try again."
                : ""
            }
            onSubmit={(data) =>
              updateProject.mutate(
                data,
                {
                  onSuccess: () =>
                    setShowEdit(false),
                }
              )
            }
            onCancel={() =>
              setShowEdit(false)
            }
          />
        </Modal>

        {/* ======================================================
            ADD DELIVERY MODAL
        ====================================================== */}

        <Modal
          open={showDelivery}
          title="Add delivery"
          onClose={() =>
            setShowDelivery(false)
          }
        >
          <DeliveryForm
            projectId={projectId}
            submitting={
              createDelivery.isPending
            }
            error={
              createDelivery.isError
                ? "Could not save. Check the fields and try again."
                : ""
            }
            onSubmit={(d) =>
              createDelivery.mutate(
                d,
                {
                  onSuccess: () =>
                    setShowDelivery(false),
                }
              )
            }
            onCancel={() =>
              setShowDelivery(false)
            }
          />
        </Modal>

        {/* ======================================================
            ADD PAYMENT MODAL
        ====================================================== */}

        <Modal
          open={showPayment}
          title="Add payment"
          onClose={() =>
            setShowPayment(false)
          }
        >
          <PaymentForm
            projectId={projectId}
            submitting={
              createPayment.isPending
            }
            error={
              createPayment.isError
                ? "Could not save. Check the fields and try again."
                : ""
            }
            onSubmit={(d) =>
              createPayment.mutate(
                d,
                {
                  onSuccess: () =>
                    setShowPayment(false),
                }
              )
            }
            onCancel={() =>
              setShowPayment(false)
            }
          />
        </Modal>
      </div>
    </main>
  );
}