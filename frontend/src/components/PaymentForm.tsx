import { useState } from "react";
import type { PaymentInput } from "../api/hooks/useProjectDetail";

const field = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm";

export default function PaymentForm({
  projectId,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  projectId: number;
  submitting: boolean;
  error: string;
  onSubmit: (d: PaymentInput) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [status, setStatus] = useState("pending");
  const [dueDate, setDueDate] = useState("");
  const [invoice, setInvoice] = useState("");

  function submit() {
    const data: PaymentInput = {
      project_id: projectId,
      amount: Number(amount),
      currency,
      status,
    };
    if (dueDate) data.due_date = dueDate;
    if (invoice.trim()) data.invoice_number = invoice.trim();
    onSubmit(data);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1">Amount *</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={field}>
            <option value="PKR">PKR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">Invoice number</label>
        <input
          placeholder="INV-2026-001"
          value={invoice}
          onChange={(e) => setInvoice(e.target.value)}
          className={field}
        />
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
            <option value="invoiced">invoiced</option>
            <option value="paid">paid</option>
            <option value="overdue">overdue</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          onClick={submit}
          disabled={submitting || !amount}
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