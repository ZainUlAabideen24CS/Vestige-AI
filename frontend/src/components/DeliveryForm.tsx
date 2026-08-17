import { useState } from "react";
import type { DeliveryInput } from "../api/hooks/useProjectDetail";

const field = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm";

export default function DeliveryForm({
  projectId,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  projectId: number;
  submitting: boolean;
  error: string;
  onSubmit: (d: DeliveryInput) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pending");
  const [dueDate, setDueDate] = useState("");

  function submit() {
    const data: DeliveryInput = { project_id: projectId, title: title.trim(), status };
    if (description.trim()) data.description = description.trim();
    if (dueDate) data.due_date = dueDate;
    onSubmit(data);
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-slate-500 block mb-1">Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">Description</label>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Due date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
            <option value="pending">pending</option>
            <option value="in_progress">in_progress</option>
            <option value="delivered">delivered</option>
            <option value="accepted">accepted</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          onClick={submit}
          disabled={submitting || !title.trim()}
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