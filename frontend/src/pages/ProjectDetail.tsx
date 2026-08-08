import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useProject, useUpdateProject, useClient } from "../api/hooks/useClients";
import { useCurrentUser } from "../api/hooks/useCurrentUser";
import Modal from "../components/Modal";
import ProjectForm from "../components/ProjectForm";

const statusStyles: Record<string, string> = {
  planning: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = Number(id);
  const [showEdit, setShowEdit] = useState(false);

  const { data: project, isLoading, isError } = useProject(projectId);
  const { data: client } = useClient(project?.client_id ?? 0);
  const { data: me } = useCurrentUser();
  const updateProject = useUpdateProject(projectId);

  const canEdit = me?.role === "admin" || me?.role === "manager";
  const canSeeBudget = canEdit;

  if (isLoading) return <p className="p-8 text-sm text-slate-500">Loading...</p>;
  if (isError || !project)
    return <p className="p-8 text-sm text-red-600">Project not found.</p>;

  return (
    <main className="p-8 max-w-5xl">
      <Link
        to="/projects"
        className="text-sm text-slate-500 hover:text-slate-900 inline-block mb-4"
      >
        ← Back to projects
      </Link>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-medium">{project.name}</h1>
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
                statusStyles[project.status] ?? "bg-slate-100 text-slate-700"
              }`}
            >
              {project.status}
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
            <dt className="text-slate-500 mb-0.5">Tech stack</dt>
            <dd>{project.tech_stack ?? "—"}</dd>
          </div>
          {canSeeBudget && (
            <div>
              <dt className="text-slate-500 mb-0.5">Budget</dt>
              <dd>{project.budget ? Number(project.budget).toLocaleString() : "—"}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-500 mb-0.5">Start date</dt>
            <dd>{project.start_date ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500 mb-0.5">End date</dt>
            <dd>{project.end_date ?? "—"}</dd>
          </div>
        </dl>

        {project.description && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm">
            <p className="text-slate-500 mb-1">Description</p>
            <p>{project.description}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {["Deliveries", "Payments", "Work logs"].map((label) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-1">{label}</h3>
            <p className="text-sm text-slate-500">None yet.</p>
          </div>
        ))}
      </div>

      <Modal open={showEdit} title="Edit project" onClose={() => setShowEdit(false)}>
        <ProjectForm
          initial={project}
          fixedClientId={project.client_id}
          submitting={updateProject.isPending}
          error={updateProject.isError ? "Could not save. Check the fields and try again." : ""}
          onSubmit={(data) =>
            updateProject.mutate(data, { onSuccess: () => setShowEdit(false) })
          }
          onCancel={() => setShowEdit(false)}
        />
      </Modal>
    </main>
  );
}