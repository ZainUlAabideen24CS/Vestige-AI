import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  useProjects,
  useCreateProject,
} from "../api/hooks/useClients";

import { useCurrentUser } from "../api/hooks/useCurrentUser";

import Modal from "../components/Modal";
import ProjectForm from "../components/ProjectForm";

import {
  FolderKanban,
  Search,
  ArrowUpRight,
  Plus,
  DollarSign,
  Code2,
} from "lucide-react";

const PAGE_SIZE = 10;

const statusStyles: Record<
  string,
  {
    chip: string;
    dot: string;
  }
> = {
  planning: {
    chip: "bg-amber-50 text-amber-700 ring-amber-100",
    dot: "bg-amber-500",
  },

  in_progress: {
    chip: "bg-blue-50 text-blue-700 ring-blue-100",
    dot: "bg-blue-500",
  },

  completed: {
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    dot: "bg-emerald-500",
  },
};

function getInitials(name: string) {
  if (!name) return "P";

  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    planning: "Planning",
    in_progress: "In progress",
    completed: "Completed",
  };

  return labels[status] ?? status;
}

export default function Projects() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);

  const navigate = useNavigate();

  const { data: me } = useCurrentUser();

  const createProject = useCreateProject();

  const canSeeBudget =
    me?.role === "admin" || me?.role === "manager";

  const canEdit =
    me?.role === "admin" || me?.role === "manager";

  const {
    data,
    isLoading,
    isError,
  } = useProjects({
    q: search || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  });

  const projects = data ?? [];

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
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

              <div className="mb-1.5 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FolderKanban
                    size={17}
                    strokeWidth={2}
                  />
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                  Project Management
                </span>
              </div>

              <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                Projects
              </h1>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Manage projects, technology stacks and project status.
              </p>

            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.98] sm:w-auto"
              >
                <Plus
                  size={16}
                  strokeWidth={2}
                />

                Add project
              </button>
            )}

          </div>
        </div>

        {/* =====================================================
            SEARCH + COUNT
        ===================================================== */}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">

          <div className="relative w-full">

            <Search
              size={17}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search projects by name..."
              value={search}
              onChange={(e) =>
                handleSearch(e.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />

          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:min-w-[150px] sm:justify-center">

            <span className="text-xs font-medium text-slate-500">
              Showing
            </span>

            <span className="ml-3 text-sm font-semibold text-slate-900">
              {projects.length} project
              {projects.length !== 1 ? "s" : ""}
            </span>

          </div>

        </div>

        {/* =====================================================
            MAIN CARD
        ===================================================== */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* ===================================================
              LOADING
          =================================================== */}

          {isLoading && (
            <div className="flex min-h-[280px] items-center justify-center px-5">

              <div className="flex flex-col items-center">

                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

                <p className="mt-3 text-sm font-medium text-slate-600">
                  Loading projects...
                </p>

              </div>

            </div>
          )}

          {/* ===================================================
              ERROR
          =================================================== */}

          {isError && (
            <div className="flex min-h-[280px] items-center justify-center px-5">

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
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                    />

                    <path
                      strokeLinecap="round"
                      d="M12 8v4M12 16h.01"
                    />
                  </svg>

                </div>

                <p className="mt-3 text-sm font-semibold text-slate-800">
                  Failed to load projects
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

          {!isLoading &&
            !isError &&
            projects.length === 0 && (
              <div className="flex min-h-[320px] items-center justify-center px-5">

                <div className="max-w-sm text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                    <FolderKanban size={25} />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-900">
                    No projects found
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {search
                      ? "Try searching with a different project name."
                      : "Create your first project to get started."}
                  </p>

                  {canEdit && !search && (
                    <button
                      type="button"
                      onClick={() => setShowAdd(true)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Plus size={14} />
                      Add project
                    </button>
                  )}

                </div>

              </div>
            )}

          {/* ===================================================
              MOBILE / TABLET CARDS
              < 768px
          =================================================== */}

          {!isLoading &&
            !isError &&
            projects.length > 0 && (
              <div className="md:hidden">

                <div className="divide-y divide-slate-100">

                  {projects.map((p) => {

                    const status =
                      statusStyles[p.status] ?? {
                        chip:
                          "bg-slate-100 text-slate-600 ring-slate-200",
                        dot: "bg-slate-400",
                      };

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          navigate(
                            `/clients/${p.client_id}`
                          )
                        }
                        className="group block w-full text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                      >

                        <div className="p-4 sm:p-5">

                          {/* Top section */}
                          <div className="flex items-start gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-blue-100">
                              {getInitials(p.name)}
                            </div>

                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-3">

                                <div className="min-w-0">

                                  <p className="truncate text-[15px] font-semibold text-slate-900">
                                    {p.name}
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-400">
                                    Project #{p.id}
                                  </p>

                                </div>

                                <span
                                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ${status.chip}`}
                                >

                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                                  />

                                  {getStatusLabel(
                                    p.status
                                  )}

                                </span>

                              </div>

                            </div>

                          </div>

                          {/* Project details */}
                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                            <div className="rounded-xl bg-slate-50 p-3">

                              <div className="flex items-center gap-2">

                                <Code2
                                  size={14}
                                  className="text-slate-400"
                                />

                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Tech stack
                                </p>

                              </div>

                              <p className="mt-1.5 break-words text-sm font-medium text-slate-800">
                                {p.tech_stack ?? "—"}
                              </p>

                            </div>

                            {canSeeBudget && (
                              <div className="rounded-xl bg-slate-50 p-3">

                                <div className="flex items-center gap-2">

                                  <DollarSign
                                    size={14}
                                    className="text-slate-400"
                                  />

                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                    Budget
                                  </p>

                                </div>

                                <p className="mt-1.5 text-sm font-semibold text-slate-800">
                                  {p.budget
                                    ? Number(
                                        p.budget
                                      ).toLocaleString()
                                    : "—"}
                                </p>

                              </div>
                            )}

                          </div>

                          {/* Action */}
                          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">

                            <span className="text-[11px] text-slate-400">
                              View client project
                            </span>

                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-transform group-hover:translate-x-0.5">

                              View project

                              <ArrowUpRight
                                size={14}
                              />

                            </span>

                          </div>

                        </div>

                      </button>
                    );
                  })}

                </div>

              </div>
            )}

          {/* ===================================================
              DESKTOP TABLE
              >= 768px
          =================================================== */}

          {!isLoading &&
            !isError &&
            projects.length > 0 && (
              <div className="hidden overflow-x-auto md:block">

                <table className="w-full min-w-[780px] text-sm">

                  <thead className="border-b border-slate-200 bg-slate-50/80">

                    <tr>

                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Project
                      </th>

                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Tech stack
                      </th>

                      {canSeeBudget && (
                        <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Budget
                        </th>
                      )}

                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {projects.map((p) => {

                      const status =
                        statusStyles[p.status] ?? {
                          chip:
                            "bg-slate-100 text-slate-600 ring-slate-200",
                          dot: "bg-slate-400",
                        };

                      return (
                        <tr
                          key={p.id}
                          onClick={() =>
                            navigate(
                              `/clients/${p.client_id}`
                            )
                          }
                          className="group cursor-pointer transition-colors hover:bg-slate-50/70"
                        >

                          {/* Project */}
                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                                {getInitials(p.name)}
                              </div>

                              <div className="min-w-0">

                                <p className="font-semibold text-slate-900">
                                  {p.name}
                                </p>

                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  Project #{p.id}
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* Tech stack */}
                          <td className="max-w-[280px] px-5 py-4">

                            <div className="flex items-center gap-2">

                              <Code2
                                size={14}
                                className="shrink-0 text-slate-400"
                              />

                              <span className="truncate text-slate-600">
                                {p.tech_stack ?? "—"}
                              </span>

                            </div>

                          </td>

                          {/* Budget */}
                          {canSeeBudget && (
                            <td className="px-5 py-4">

                              <div className="flex items-center gap-1.5 text-slate-600">

                                <DollarSign
                                  size={14}
                                  className="text-slate-400"
                                />

                                <span>
                                  {p.budget
                                    ? Number(
                                        p.budget
                                      ).toLocaleString()
                                    : "—"}
                                </span>

                              </div>

                            </td>
                          )}

                          {/* Status */}
                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ${status.chip}`}
                            >

                              <span
                                className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                              />

                              {getStatusLabel(
                                p.status
                              )}

                            </span>

                          </td>

                          {/* Action */}
                          <td className="px-5 py-4 text-right">

                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-transform group-hover:translate-x-0.5">

                              View

                              <ArrowUpRight
                                size={14}
                              />

                            </span>

                          </td>

                        </tr>
                      );
                    })}

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
              type="button"
              onClick={() =>
                setPage((p) =>
                  Math.max(0, p - 1)
                )
              }
              disabled={page === 0}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              ← Previous
            </button>

            <button
              type="button"
              onClick={() =>
                setPage((p) => p + 1)
              }
              disabled={
                !data ||
                data.length < PAGE_SIZE
              }
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              Next →
            </button>

          </div>

        </div>

      </div>

      {/* =======================================================
          ADD PROJECT MODAL
      ======================================================= */}

      <Modal
        open={showAdd}
        title="Add project"
        onClose={() => setShowAdd(false)}
      >
        <ProjectForm
          submitting={createProject.isPending}
          error={
            createProject.isError
              ? "Could not save. Check the fields and try again."
              : ""
          }
          onSubmit={(formData) =>
            createProject.mutate(formData, {
              onSuccess: () =>
                setShowAdd(false),
            })
          }
          onCancel={() =>
            setShowAdd(false)
          }
        />
      </Modal>
    </main>
  );
}