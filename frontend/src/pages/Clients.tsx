import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useClients,
  useCreateClient,
} from "../api/hooks/useClients";
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

  const canEdit =
    me?.role === "admin" || me?.role === "manager";

  const {
    data,
    isLoading,
    isError,
  } = useClients({
    q: search || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  });

  const clients = data ?? [];

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  function getInitials(name: string) {
    if (!name) return "C";

    const words = name.trim().split(/\s+/);

    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return (
    <main className="w-full min-w-0 overflow-x-hidden">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

        {/* =====================================================
            PAGE HEADER
        ===================================================== */}
        <div className="mb-5 sm:mb-7">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
                    />
                    <circle
                      cx="9"
                      cy="7"
                      r="4"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                    />
                  </svg>
                </div>

                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                  Business Relations
                </span>
              </div>

              <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                Clients
              </h1>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Manage your clients and view their projects.
              </p>
            </div>

            {canEdit && (
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.98] sm:w-auto"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    d="M12 5v14M5 12h14"
                  />
                </svg>

                Add client
              </button>
            )}
          </div>
        </div>

        {/* =====================================================
            SEARCH + STATS
        ===================================================== */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">

          {/* Search */}
          <div className="relative w-full">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="7" />
              <path
                strokeLinecap="round"
                d="m20 20-3.5-3.5"
              />
            </svg>

            <input
              type="text"
              placeholder="Search clients by company..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          {/* Client count */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:min-w-[145px] sm:justify-center">
            <span className="text-xs font-medium text-slate-500">
              Showing
            </span>

            <span className="ml-3 text-sm font-semibold text-slate-900">
              {clients.length} client{clients.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* ===================================================
              LOADING
          =================================================== */}
          {isLoading && (
            <div className="flex min-h-[260px] items-center justify-center px-5">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

                <p className="mt-3 text-sm font-medium text-slate-600">
                  Loading clients...
                </p>
              </div>
            </div>
          )}

          {/* ===================================================
              ERROR
          =================================================== */}
          {isError && (
            <div className="flex min-h-[260px] items-center justify-center px-5">
              <div className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v4"
                    />
                    <path
                      strokeLinecap="round"
                      d="M12 17h.01"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                    />
                  </svg>
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-800">
                  Failed to load clients
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Please try again.
                </p>
              </div>
            </div>
          )}

          {/* ===================================================
              EMPTY
          =================================================== */}
          {!isLoading && !isError && clients.length === 0 && (
            <div className="flex min-h-[300px] items-center justify-center px-5">
              <div className="max-w-sm text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <svg
                    width="25"
                    height="25"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
                    />
                    <circle
                      cx="9"
                      cy="7"
                      r="4"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                    />
                  </svg>
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-900">
                  No clients found
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {search
                    ? "Try searching with a different company name."
                    : "Add your first client to get started."}
                </p>

                {canEdit && !search && (
                  <button
                    onClick={() => setShowAdd(true)}
                    className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    Add your first client
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ===================================================
              MOBILE / TABLET CARDS
              < 768px
          =================================================== */}
          {!isLoading && !isError && clients.length > 0 && (
            <div className="md:hidden">

              <div className="divide-y divide-slate-100">

                {clients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="group block w-full text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                  >
                    <div className="p-4 sm:p-5">

                      {/* Top row */}
                      <div className="flex items-start gap-3">

                        {/* Company avatar */}
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-blue-100">
                          {getInitials(c.company_name)}
                        </div>

                        {/* Company */}
                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-semibold text-slate-900">
                                {c.company_name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500">
                                Client #{c.id}
                              </p>
                            </div>

                            {/* Status */}
                            <span
                              className={
                                c.status === "active"
                                  ? "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-emerald-700 ring-1 ring-emerald-100"
                                  : "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold capitalize text-slate-600 ring-1 ring-slate-200"
                              }
                            >
                              <span
                                className={
                                  c.status === "active"
                                    ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                                    : "h-1.5 w-1.5 rounded-full bg-slate-400"
                                }
                              />

                              {c.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info section */}
                      <div className="mt-4 grid grid-cols-2 gap-3">

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Contact
                          </p>

                          <p className="mt-1 truncate text-sm font-medium text-slate-800">
                            {c.contact_name ?? "—"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Industry
                          </p>

                          <p className="mt-1 truncate text-sm font-medium text-slate-800">
                            {c.industry ?? "—"}
                          </p>
                        </div>
                      </div>

                      {/* Bottom action */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">

                        <span className="text-[11px] text-slate-400">
                          View client details
                        </span>

                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-transform group-hover:translate-x-0.5">
                          View client
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 12h14M13 6l6 6-6 6"
                            />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ===================================================
              DESKTOP TABLE
              >= 768px
          =================================================== */}
          {!isLoading && !isError && clients.length > 0 && (
            <div className="hidden md:block overflow-x-auto">

              <table className="w-full min-w-[760px] text-sm">

                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>

                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Company
                    </th>

                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Contact
                    </th>

                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Industry
                    </th>

                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Action
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {clients.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/clients/${c.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-slate-50/70"
                    >

                      {/* Company */}
                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                            {getInitials(c.company_name)}
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">
                              {c.company_name}
                            </p>

                            <p className="mt-0.5 text-[11px] text-slate-400">
                              Client #{c.id}
                            </p>
                          </div>

                        </div>

                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <span className="text-slate-600">
                          {c.contact_name ?? "—"}
                        </span>
                      </td>

                      {/* Industry */}
                      <td className="px-5 py-4">
                        <span className="text-slate-600">
                          {c.industry ?? "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">

                        <span
                          className={
                            c.status === "active"
                              ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-emerald-700 ring-1 ring-emerald-100"
                              : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold capitalize text-slate-600 ring-1 ring-slate-200"
                          }
                        >
                          <span
                            className={
                              c.status === "active"
                                ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                                : "h-1.5 w-1.5 rounded-full bg-slate-400"
                            }
                          />

                          {c.status}
                        </span>

                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">

                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-all group-hover:translate-x-0.5">
                          View
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 12h14M13 6l6 6-6 6"
                            />
                          </svg>
                        </span>

                      </td>

                    </tr>
                  ))}

                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* =====================================================
            PAGINATION
        ===================================================== */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="text-xs text-slate-500">
            Page{" "}
            <span className="font-semibold text-slate-700">
              {page + 1}
            </span>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">

            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              ← Previous
            </button>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data || data.length < PAGE_SIZE}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              Next →
            </button>

          </div>
        </div>

      </div>

      {/* =======================================================
          ADD CLIENT MODAL
      ======================================================= */}
      <Modal
        open={showAdd}
        title="Add client"
        onClose={() => setShowAdd(false)}
      >
        <ClientForm
          submitting={createClient.isPending}
          error={
            createClient.isError
              ? "Could not save. Check the fields and try again."
              : ""
          }
          onSubmit={(formData) =>
            createClient.mutate(formData, {
              onSuccess: () => setShowAdd(false),
            })
          }
          onCancel={() => setShowAdd(false)}
        />
      </Modal>
    </main>
  );
}