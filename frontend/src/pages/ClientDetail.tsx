import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useClient,
  useClientProjects,
  useUpdateClient,
} from "../api/hooks/useClients";
import { useCurrentUser } from "../api/hooks/useCurrentUser";
import Modal from "../components/Modal";
import ClientForm from "../components/ClientForm";

const statusStyles: Record<string, string> = {
  planning: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = Number(id);
  const [showEdit, setShowEdit] = useState(false);

  const { data: client, isLoading, isError } = useClient(clientId);
  const { data: projects } = useClientProjects(clientId);
  const { data: me } = useCurrentUser();
  const updateClient = useUpdateClient(clientId);

  const canEdit = me?.role === "admin" || me?.role === "manager";
  const canSeeBudget = canEdit;
  const navigate = useNavigate();

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
                <div className="h-12 bg-slate-100 rounded" />
                <div className="h-12 bg-slate-100 rounded" />
                <div className="h-12 bg-slate-100 rounded" />
                <div className="h-12 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isError || !client) {
    return (
      <main className="w-full min-w-0 overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-3 py-6 sm:px-5 lg:px-8">
          <div className="bg-white border border-red-200 rounded-xl p-6">
            <p className="text-sm text-red-600">Client not found.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

        {/* Back */}
        <Link
          to="/clients"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          ←
          <span className="ml-1">Back to clients</span>
        </Link>

        {/* Client Overview */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="p-4 sm:p-6">

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">

              {/* Client name */}
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 break-words">
                  {client.company_name}
                </h1>

                <p className="text-sm text-slate-500 mt-1">
                  {client.industry ?? "No industry set"}
                </p>
              </div>

              {/* Status + Edit */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span
                  className={
                    client.status === "active"
                      ? "px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      : "px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
                  }
                >
                  {client.status}
                </span>

                {canEdit && (
                  <button
                    onClick={() => setShowEdit(true)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Client Information */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 text-sm">

              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                  Contact
                </dt>
                <dd className="text-slate-900 break-words">
                  {client.contact_name ?? "—"}
                </dd>
              </div>

              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                  Email
                </dt>
                <dd className="text-slate-900 break-all">
                  {client.contact_email ?? "—"}
                </dd>
              </div>

              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                  Phone
                </dt>
                <dd className="text-slate-900 break-words">
                  {client.contact_phone ?? "—"}
                </dd>
              </div>

              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                  Client since
                </dt>
                <dd className="text-slate-900">
                  {new Date(client.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>

            {/* Notes */}
            {client.notes && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                  Notes
                </p>

                <p className="text-sm text-slate-700 leading-6 whitespace-pre-wrap break-words">
                  {client.notes}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Projects Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Projects
              {projects ? (
                <span className="ml-1 text-slate-500 font-normal">
                  ({projects.length})
                </span>
              ) : null}
            </h2>

            <p className="text-sm text-slate-500 mt-0.5">
              Projects associated with this client
            </p>
          </div>
        </div>

        {/* Projects Container */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

          {/* Loading */}
          {!projects && (
            <div className="p-6">
              <p className="text-sm text-slate-500">Loading projects...</p>
            </div>
          )}

          {/* Empty */}
          {projects && projects.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm font-medium text-slate-700">
                No projects for this client yet.
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Projects associated with this client will appear here.
              </p>
            </div>
          )}

          {/* Mobile Project Cards */}
          {projects && projects.length > 0 && (
            <div className="md:hidden divide-y divide-slate-100">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="w-full text-left p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-slate-900 break-words">
                        {p.name}
                      </h3>

                      <div className="mt-3 space-y-2.5">

                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">
                            Tech stack
                          </p>

                          <p className="text-sm text-slate-700 break-words">
                            {p.tech_stack ?? "—"}
                          </p>
                        </div>

                        {canSeeBudget && (
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5">
                              Budget
                            </p>

                            <p className="text-sm text-slate-700">
                              {p.budget
                                ? Number(p.budget).toLocaleString()
                                : "—"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusStyles[p.status] ??
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs font-medium text-blue-600">
                    View project →
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Desktop / Tablet Table */}
          {projects && projects.length > 0 && (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[650px] text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">
                      Project
                    </th>

                    <th className="text-left px-4 py-3 font-semibold text-slate-700">
                      Tech stack
                    </th>

                    {canSeeBudget && (
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">
                        Budget
                      </th>
                    )}

                    <th className="text-left px-4 py-3 font-semibold text-slate-700">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {projects.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {p.name}
                      </td>

                      <td className="px-4 py-3 text-slate-600 max-w-[260px]">
                        <span className="block truncate">
                          {p.tech_stack ?? "—"}
                        </span>
                      </td>

                      {canSeeBudget && (
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {p.budget
                            ? Number(p.budget).toLocaleString()
                            : "—"}
                        </td>
                      )}

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            statusStyles[p.status] ??
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Edit Client Modal */}
        <Modal
          open={showEdit}
          title="Edit client"
          onClose={() => setShowEdit(false)}
        >
          <ClientForm
            initial={client}
            submitting={updateClient.isPending}
            error={
              updateClient.isError
                ? "Could not save. Check the fields and try again."
                : ""
            }
            onSubmit={(data) =>
              updateClient.mutate(data, {
                onSuccess: () => setShowEdit(false),
              })
            }
            onCancel={() => setShowEdit(false)}
          />
        </Modal>
      </div>
    </main>
  );
}