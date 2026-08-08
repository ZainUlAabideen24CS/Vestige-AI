import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients, useCreateClient } from "../api/hooks/useClients";
import { useCurrentUser } from "../api/hooks/useCurrentUser";
import Modal from "../components/Modal";
import ClientForm from "../components/ClientForm";

const PAGE_SIZE = 10;

export default function Clients() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();

  const { data: me } = useCurrentUser();
  const createClient = useCreateClient();

  const canEdit = me?.role === "admin" || me?.role === "manager";

  const { data, isLoading, isError } = useClients({
    q: search || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  });

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium">Clients</h2>
        <div className="flex gap-3">
          <input
            placeholder="Search by company..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-64"
          />
          {canEdit && (
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm whitespace-nowrap"
            >
              Add client
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading...</p>}
        {isError && <p className="p-6 text-sm text-red-600">Failed to load clients.</p>}

        {data && data.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No clients found.</p>
        )}

        {data && data.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Company</th>
                <th className="text-left px-4 py-3 font-medium">Contact</th>
                <th className="text-left px-4 py-3 font-medium">Industry</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-3">{c.company_name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.contact_name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.industry ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        c.status === "active"
                          ? "px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800"
                          : "px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700"
                      }
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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

      <Modal open={showAdd} title="Add client" onClose={() => setShowAdd(false)}>
        <ClientForm
          submitting={createClient.isPending}
          error={createClient.isError ? "Could not save. Check the fields and try again." : ""}
          onSubmit={(data) =>
            createClient.mutate(data, { onSuccess: () => setShowAdd(false) })
          }
          onCancel={() => setShowAdd(false)}
        />
      </Modal>
    </main>
  );
}