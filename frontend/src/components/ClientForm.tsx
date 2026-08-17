import { useState } from "react";
import type { ClientInput } from "../api/hooks/useClients";
import { useUsers } from "../api/hooks/useUsers";

interface Props {
  initial?: {
    company_name?: string;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    industry?: string | null;
    status?: string;
    notes?: string | null;
    account_manager_id?: number | null;
  };
  submitting: boolean;
  error: string;
  onSubmit: (data: ClientInput) => void;
  onCancel: () => void;
}

const field = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm";

export default function ClientForm({ initial, submitting, error, onSubmit, onCancel }: Props) {
  const { data: managers } = useUsers("manager");

  const [accountManagerId, setAccountManagerId] = useState<string>(
    String(initial?.account_manager_id ?? "")
  );

  const [form, setForm] = useState<ClientInput>({
    company_name: initial?.company_name ?? "",
    contact_name: initial?.contact_name ?? "",
    contact_email: initial?.contact_email ?? "",
    contact_phone: initial?.contact_phone ?? "",
    industry: initial?.industry ?? "",
    status: initial?.status ?? "active",
    notes: initial?.notes ?? "",
  });

  function set(key: keyof ClientInput, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    const cleaned: ClientInput = { company_name: form.company_name.trim() };
    (["contact_name", "contact_email", "contact_phone", "industry", "notes"] as const).forEach(
      (k) => {
        const v = form[k]?.trim();
        if (v) cleaned[k] = v;
      }
    );
    cleaned.status = form.status;
    if (accountManagerId) cleaned.account_manager_id = Number(accountManagerId);
    onSubmit(cleaned);
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-slate-500 block mb-1">Company name *</label>
        <input
          value={form.company_name}
          onChange={(e) => set("company_name", e.target.value)}
          className={field}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Contact name</label>
          <input
            value={form.contact_name}
            onChange={(e) => set("contact_name", e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Industry</label>
          <input
            value={form.industry}
            onChange={(e) => set("industry", e.target.value)}
            className={field}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Email</label>
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => set("contact_email", e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Phone</label>
          <input
            value={form.contact_phone}
            onChange={(e) => set("contact_phone", e.target.value)}
            className={field}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">Account manager</label>
        <select
          value={accountManagerId}
          onChange={(e) => setAccountManagerId(e.target.value)}
          className={field}
        >
          <option value="">Unassigned</option>
          {managers?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">Status</label>
        <select
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
          className={field}
        >
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">Notes</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={field}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !form.company_name.trim()}
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