import { useState } from "react";
import { useClients, type ProjectInput } from "../api/hooks/useClients";

interface Props {
  initial?: {
    name?: string;
    client_id?: number;
    description?: string | null;
    status?: string;
    tech_stack?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    budget?: string | null;
  };
  fixedClientId?: number;
  submitting: boolean;
  error: string;
  onSubmit: (data: ProjectInput) => void;
  onCancel: () => void;
}

const field = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm";

export default function ProjectForm({
  initial,
  fixedClientId,
  submitting,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const { data: clients } = useClients({ limit: 100 });

  const [name, setName] = useState(initial?.name ?? "");
  const [clientId, setClientId] = useState<string>(
    String(initial?.client_id ?? fixedClientId ?? "")
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "planning");
  const [techStack, setTechStack] = useState(initial?.tech_stack ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [budget, setBudget] = useState(initial?.budget ?? "");

  function handleSubmit() {
    const data: ProjectInput = {
      name: name.trim(),
      client_id: Number(clientId),
      status,
    };
    if (description.trim()) data.description = description.trim();
    if (techStack.trim()) data.tech_stack = techStack.trim();
    if (startDate) data.start_date = startDate;
    if (endDate) data.end_date = endDate;
    if (budget) data.budget = budget;

    onSubmit(data);
  }

  const valid = name.trim() && clientId;

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-slate-500 block mb-1">Project name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </div>

      {!fixedClientId && (
        <div>
          <label className="text-xs text-slate-500 block mb-1">Client *</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={field}
          >
            <option value="">Select a client...</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs text-slate-500 block mb-1">Description</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={field}
        />
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">Tech stack</label>
        <input
          placeholder="FastAPI, React, SQL Server"
          value={techStack}
          onChange={(e) => setTechStack(e.target.value)}
          className={field}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={field}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
            <option value="planning">planning</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Budget</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className={field}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !valid}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm disabled:opacity-40"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}