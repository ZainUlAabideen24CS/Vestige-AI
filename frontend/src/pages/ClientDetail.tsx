import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useClient, useClientProjects, useUpdateClient } from "../api/hooks/useClients";
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

  if (isLoading) return <p className="p-8 text-sm text-slate-500">Loading...</p>;
  if (isError || !client) return <p className="p-8 text-sm text-red-600">Client not found.</p>;

  return (
    <main className="p-8 max-w-5xl">
      <Link
        to="/clients"
        className="text-sm text-slate-500 hover:text-slate-900 inline-block mb-4"
      >
        ← Back to clients
      </Link>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-medium">{client.company_name}</h1>
            <p className="text-sm text-slate-500">{client.industry ?? "No industry set"}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={
                client.status === "active"
                  ? "px-2.5 py-1 rounded-full text-xs bg-green-100 text-green-800"
                  : "px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-700"
              }
            >
              {client.status}
            </span>
            {canEdit && (
              <button
                onClick={() => setShowEdit(true)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500 mb-0.5">Contact</dt>
            <dd>{client.contact_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500 mb-0.5">Email</dt>
            <dd>{client.contact_email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500 mb-0.5">Phone</dt>
            <dd>{client.contact_phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500 mb-0.5">Client since</dt>
            <dd>{new Date(client.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>

        {client.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm">
            <p className="text-slate-500 mb-1">Notes</p>
            <p>{client.notes}</p>
          </div>
        )}
      </div>

      <h2 className="text-lg font-medium mb-3">
        Projects{projects ? ` (${projects.length})` : ""}
      </h2>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {!projects && <p className="p-6 text-sm text-slate-500">Loading...</p>}
        {projects && projects.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No projects for this client yet.</p>
        )}
        {projects && projects.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Project</th>
                <th className="text-left px-4 py-3 font-medium">Tech stack</th>
                {canSeeBudget && (
                  <th className="text-left px-4 py-3 font-medium">Budget</th>
                )}
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.tech_stack ?? "—"}</td>
                  {canSeeBudget && (
                    <td className="px-4 py-3 text-slate-600">
                      {p.budget ? Number(p.budget).toLocaleString() : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        statusStyles[p.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showEdit} title="Edit client" onClose={() => setShowEdit(false)}>
        <ClientForm
          initial={client}
          submitting={updateClient.isPending}
          error={updateClient.isError ? "Could not save. Check the fields and try again." : ""}
          onSubmit={(data) =>
            updateClient.mutate(data, { onSuccess: () => setShowEdit(false) })
          }
          onCancel={() => setShowEdit(false)}
        />
      </Modal>
    </main>
  );
}