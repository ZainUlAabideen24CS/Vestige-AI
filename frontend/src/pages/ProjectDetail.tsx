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
  "text-xs border border-slate-200 rounded-md px-1.5 py-1 bg-white";


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

  /*
   * Backend now returns:
   *
   * {
   *   project_id: number,
   *   manager_id: number | null,
   *   can_manage_members: boolean,
   *   members: [...]
   * }
   *
   * Therefore we must NOT treat the response itself
   * as the members array.
   */

  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersError,
  } = useProjectMembers(projectId);


  const members = membersData?.members ?? [];


  /*
   * IMPORTANT:
   *
   * Member-management permission now comes directly
   * from the backend.
   *
   * This means:
   *
   * Admin                  -> true
   * Actual project manager -> true
   * Project member         -> false
   *
   * Even if the user has global role "manager",
   * they cannot manage a project unless they are
   * the manager of THAT project.
   */

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
  // LOCAL STATE FOR ADD EMPLOYEE
  // ============================================================

  const [selectedEmployee, setSelectedEmployee] =
    useState<number | "">("");


  // ============================================================
  // LOADING / ERROR
  // ============================================================

  if (isLoading) {
    return (
      <p className="p-8 text-sm text-slate-500">
        Loading...
      </p>
    );
  }


  if (isError || !project) {
    return (
      <p className="p-8 text-sm text-red-600">
        Project not found.
      </p>
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

  /*
   * Employees available for assignment:
   *
   * - active users
   * - not already active members
   * - not project manager
   */

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
    <main className="p-8 max-w-5xl">

      {/* ======================================================
          BACK
      ====================================================== */}

      <Link
        to="/projects"
        className="text-sm text-slate-500 hover:text-slate-900 inline-block mb-4"
      >
        ← Back to projects
      </Link>


      {/* ======================================================
          PROJECT INFORMATION
      ====================================================== */}

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">

        <div className="flex justify-between items-start mb-4">

          <div>

            <h1 className="text-2xl font-medium">
              {project.name}
            </h1>


            {client && (
              <Link
                to={`/clients/${client.id}`}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                {client.company_name}
              </Link>
            )}

          </div>


          <div className="flex items-center gap-3">

            <span
              className={`px-2.5 py-1 rounded-full text-xs ${
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
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              >
                Edit
              </button>
            )}

          </div>

        </div>


        <dl className="grid grid-cols-2 gap-4 text-sm">

          <div>

            <dt className="text-slate-500 mb-0.5">
              Tech stack
            </dt>

            <dd>
              {project.tech_stack ?? "—"}
            </dd>

          </div>


          {canSeeBudget && (
            <div>

              <dt className="text-slate-500 mb-0.5">
                Budget
              </dt>

              <dd>
                {project.budget
                  ? Number(
                      project.budget
                    ).toLocaleString()
                  : "—"}
              </dd>

            </div>
          )}


          <div>

            <dt className="text-slate-500 mb-0.5">
              Start date
            </dt>

            <dd>
              {project.start_date ?? "—"}
            </dd>

          </div>


          <div>

            <dt className="text-slate-500 mb-0.5">
              End date
            </dt>

            <dd>
              {project.end_date ?? "—"}
            </dd>

          </div>

        </dl>


        {project.description && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm">

            <p className="text-slate-500 mb-1">
              Description
            </p>

            <p>
              {project.description}
            </p>

          </div>
        )}

      </div>


      {/* ======================================================
          TEAM MEMBERS
      ====================================================== */}

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">

        <div className="mb-4">

          <h2 className="text-lg font-medium">
            Team Members
            {members
              ? ` (${members.length})`
              : ""}
          </h2>


          <p className="text-sm text-slate-500 mt-1">
            Employees currently assigned to this project.
          </p>

        </div>


        {/* MEMBER ERROR */}

        {membersError && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
            Could not load project members.
          </div>
        )}


        {/* MEMBER LOADING */}

        {membersLoading && (
          <p className="text-sm text-slate-500">
            Loading team members...
          </p>
        )}


        {/* NO MEMBERS */}

        {!membersLoading &&
          members.length === 0 && (
            <p className="text-sm text-slate-500">
              No team members assigned.
            </p>
          )}


        {/* MEMBER LIST */}

        <div className="space-y-2">

          {members.map((member) => (

            <div
              key={member.user_id}
              className="flex justify-between items-center gap-3 border border-slate-100 rounded-lg p-4"
            >

              <div className="min-w-0">

                <p className="text-sm font-medium">
                  {member.full_name}
                </p>

                <p className="text-xs text-slate-500">
                  {member.email}
                </p>

              </div>


              <div className="flex items-center gap-3">

                <span
                  className={`px-2.5 py-1 rounded-full text-xs ${
                    member.role_on_project ===
                    "manager"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {member.role_on_project}
                </span>


                {/* REMOVE */}

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
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {removeMember.isPending
                        ? "Removing..."
                        : "Remove"}
                    </button>

                  )}

              </div>

            </div>

          ))}

        </div>


        {/* ====================================================
            ADD EMPLOYEE
        ==================================================== */}

        {canManageMembers && (

          <div className="mt-6 pt-5 border-t border-slate-100">

            <h3 className="text-sm font-medium mb-3">
              Add employee
            </h3>


            {usersLoading ? (

              <p className="text-sm text-slate-500">
                Loading employees...
              </p>

            ) : (

              <div className="flex gap-2">

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
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
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
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm disabled:opacity-50"
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

      </div>


      {/* ======================================================
          DELIVERIES + PAYMENTS
      ====================================================== */}

      <div className="grid grid-cols-2 gap-4 mb-6">

        {/* DELIVERIES */}

        <div className="bg-white border border-slate-200 rounded-xl p-5">

          <div className="flex justify-between items-center mb-3">

            <h3 className="text-sm font-medium">
              Deliveries
              {deliveries
                ? ` (${deliveries.length})`
                : ""}
            </h3>


            {canEdit && (
              <button
                onClick={() =>
                  setShowDelivery(true)
                }
                className="text-xs text-slate-500 hover:text-slate-900"
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


          <div className="space-y-2">

            {deliveries?.map((d) => (

              <div
                key={d.id}
                className="flex justify-between items-center gap-3 text-sm"
              >

                <div className="min-w-0">

                  <p className="truncate">
                    {d.title}
                  </p>

                  <p className="text-xs text-slate-500">

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
                    className={selectClass}
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
                    className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${
                      d.status === "accepted" ||
                      d.status === "delivered"
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

            ))}

          </div>

        </div>


        {/* PAYMENTS */}

        {canEdit && (

          <div className="bg-white border border-slate-200 rounded-xl p-5">

            <div className="flex justify-between items-center mb-3">

              <h3 className="text-sm font-medium">
                Payments
                {payments
                  ? ` (${payments.length})`
                  : ""}
              </h3>


              <button
                onClick={() =>
                  setShowPayment(true)
                }
                className="text-xs text-slate-500 hover:text-slate-900"
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


            <div className="space-y-2">

              {payments?.map((p) => (

                <div
                  key={p.id}
                  className="flex justify-between items-center gap-3 text-sm"
                >

                  <div className="min-w-0">

                    <p>
                      {p.currency}{" "}
                      {Number(
                        p.amount
                      ).toLocaleString()}
                    </p>

                    <p className="text-xs text-slate-500 truncate">

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
                    className={selectClass}
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

              ))}

            </div>

          </div>

        )}

      </div>


      {/* ======================================================
          WORK LOGS
      ====================================================== */}

      <h2 className="text-lg font-medium mb-3">

        Work logs

        {logs
          ? ` (${logs.length})`
          : ""}

      </h2>


      <div className="space-y-3">

        {logs &&
          logs.length === 0 && (

            <div className="bg-white border border-slate-200 rounded-xl p-6">

              <p className="text-sm text-slate-500">
                Nothing logged on this project yet.
              </p>

            </div>

          )}


        {logs?.map((log) => (

          <div
            key={log.id}
            className="bg-white border border-slate-200 rounded-xl p-5"
          >

            <div className="mb-2">

              <p className="text-sm font-medium">
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


            <p className="text-sm text-slate-700 mb-3">
              {log.summary}
            </p>


            {log.technologies && (

              <div className="flex flex-wrap gap-1.5 mb-2">

                {log.technologies
                  .split(",")
                  .map((t) => (

                    <span
                      key={t}
                      className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600"
                    >
                      {t.trim()}
                    </span>

                  ))}

              </div>

            )}


            {log.blockers && (

              <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                Blocked: {log.blockers}
              </p>

            )}

          </div>

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

    </main>
  );
}