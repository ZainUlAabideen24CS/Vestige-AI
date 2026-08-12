import { useState } from "react";
import { useWorkLogs, useCreateWorkLog, type WorkLogInput } from "../api/hooks/useWorkLogs";
import { useProjects } from "../api/hooks/useClients";
import Modal from "../components/Modal";

const PAGE_SIZE = 20;
const field = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm";

function LogForm({
  onSubmit,
  onCancel,
  submitting,
  error,
}: {
  onSubmit: (d: WorkLogInput) => void;
  onCancel: () => void;
  submitting: boolean;
  error: string;
}) {
  const { data: projects } = useProjects({ limit: 100 });
  const [projectId, setProjectId] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState("");
  const [hours, setHours] = useState("");
  const [technologies, setTechnologies] = useState("");
  const [blockers, setBlockers] = useState("");

  function submit() {
    const data: WorkLogInput = {
      project_id: Number(projectId),
      log_date: logDate,
      summary: summary.trim(),
    };
    if (hours) data.hours = Number(hours);
    if (technologies.trim()) data.technologies = technologies.trim();
    if (blockers.trim()) data.blockers = blockers.trim();
    onSubmit(data);
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-slate-500 block mb-1">Project *</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={field}>
          <option value="">Select a project...</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Date *</label>
          <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className={field} />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Hours</label>
          <input type="number" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} className={field} />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">What did you work on? *</label>
        <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className={field} />
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">Technologies used</label>
        <input
          placeholder="FastAPI, Qdrant, React"
          value={technologies}
          onChange={(e) => setTechnologies(e.target.value)}
          className={field}
        />
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">Blockers</label>
        <textarea rows={2} value={blockers} onChange={(e) => setBlockers(e.target.value)} className={field} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          onClick={submit}
          disabled={submitting || !projectId || !summary.trim()}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm disabled:opacity-40"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-slate-300 rounded-lg text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function WorkLogs() {
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, isError } = useWorkLogs({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });
  const create = useCreateWorkLog();

  return (
    <main className="p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-xl font-medium">Work logs</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm"
        >
          Log work
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        What the team worked on, which technologies they used, and what blocked them.
      </p>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {isError && <p className="text-sm text-red-600">Could not load work logs.</p>}

      {data && data.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm text-slate-500">No work logged yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {data?.map((log) => (
          <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-medium">{log.user_name ?? "Unknown"}</p>
                <p className="text-xs text-slate-500">
                  {log.project_name ?? `Project ${log.project_id}`} · {log.log_date}
                  {log.hours && ` · ${Number(log.hours)}h`}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-3">{log.summary}</p>

            {log.technologies && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {log.technologies.split(",").map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
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

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-sm text-slate-500">Page {page + 1}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!data || data.length < PAGE_SIZE}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <Modal open={showAdd} title="Log work" onClose={() => setShowAdd(false)}>
        <LogForm
          submitting={create.isPending}
          error={create.isError ? "Could not save. You may not be assigned to that project." : ""}
          onSubmit={(d) => create.mutate(d, { onSuccess: () => setShowAdd(false) })}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>
    </main>
  );
}