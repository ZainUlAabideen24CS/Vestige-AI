import { useNavigate } from "react-router-dom";

import {
  Users,
  FolderKanban,
  FileText,
  Sparkles,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

import { useDashboard } from "../api/hooks/useDashboard";
import { useCurrentUser } from "../api/hooks/useCurrentUser";

const statusMeta: Record<
  string,
  {
    label: string;
    bar: string;
    chip: string;
  }
> = {
  planning: {
    label: "Planning",
    bar: "bg-amber-400",
    chip: "bg-amber-50 text-amber-700",
  },

  in_progress: {
    label: "In progress",
    bar: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700",
  },

  completed: {
    label: "Completed",
    bar: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700",
  },
};

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  sub?: string;
  accent: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group w-full rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition-all sm:p-5 ${
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}
        >
          <Icon size={18} strokeWidth={2} />
        </div>

        {onClick && (
          <ArrowUpRight
            size={15}
            className="text-slate-300 transition-colors group-hover:text-slate-500"
          />
        )}
      </div>

      <div className="mt-4">
        <p className="text-2xl font-semibold tracking-tight text-slate-950 tabular-nums sm:text-3xl">
          {value}
        </p>

        <p className="mt-0.5 text-sm font-medium text-slate-700">
          {label}
        </p>

        {sub && (
          <p className="mt-1.5 text-[11px] leading-4 text-slate-400 sm:text-xs">
            {sub}
          </p>
        )}
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError } = useDashboard();

  const { data: me } = useCurrentUser();

  const navigate = useNavigate();

  /* =========================================================
     LOADING
  ========================================================= */

  if (isLoading) {
    return (
      <main className="w-full min-w-0 overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          {/* Header skeleton */}
          <div className="mb-6">
            <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-200 sm:h-8 sm:w-60" />
            <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded bg-slate-100" />
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl bg-slate-100 sm:h-40"
              />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100 lg:col-span-2" />
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100 lg:col-span-3" />
          </div>
        </div>
      </main>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (isError || !data) {
    return (
      <main className="w-full min-w-0 overflow-x-hidden">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="9" />
                <path
                  strokeLinecap="round"
                  d="M12 8v4M12 16h.01"
                />
              </svg>
            </div>

            <h2 className="mt-4 text-sm font-semibold text-slate-900">
              Could not load dashboard
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Please refresh the page and try again.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const total = data.projects || 1;

  return (
    <main className="w-full min-w-0 overflow-x-hidden">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-5 sm:mb-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Sparkles size={15} strokeWidth={2} />
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                  Vestige Intelligence
                </span>
              </div>

              <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                {me
                  ? `Good to see you, ${
                      me.full_name.split(" ")[0]
                    }`
                  : "Dashboard"}
              </h1>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                {data.chunks > 0
                  ? `${data.chunks} searchable passages across ${
                      data.documents + data.meetings
                    } sources.`
                  : "Nothing ingested yet — upload a document to start building the knowledge base."}
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================
            STAT CARDS
        ===================================================== */}

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          <Stat
            icon={Users}
            label="Clients"
            value={data.clients}
            sub={`${data.active_clients} active`}
            accent="bg-violet-50 text-violet-600"
            onClick={() => navigate("/clients")}
          />

          <Stat
            icon={FolderKanban}
            label="Projects"
            value={data.projects}
            sub={`${
              data.project_status.completed ?? 0
            } completed · ${
              data.project_status.in_progress ?? 0
            } in progress`}
            accent="bg-blue-50 text-blue-600"
            onClick={() => navigate("/projects")}
          />

          <Stat
            icon={FileText}
            label="Sources"
            value={data.documents + data.meetings}
            sub={`${data.documents} docs · ${data.meetings} recordings`}
            accent="bg-amber-50 text-amber-600"
            onClick={() => navigate("/ingest")}
          />

          <Stat
            icon={Sparkles}
            label="Searchable passages"
            value={data.chunks}
            sub="Available to Vestige AI"
            accent="bg-emerald-50 text-emerald-600"
            onClick={() => navigate("/search")}
          />
        </div>

        {/* =====================================================
            PIPELINE + RECENT PROJECTS
        ===================================================== */}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

          {/* ===================================================
              PROJECT PIPELINE
          =================================================== */}

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Project pipeline
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Current project distribution
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <FolderKanban size={15} />
              </div>
            </div>

            {Object.keys(data.project_status).length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-600">
                  No projects yet.
                </p>

                <button
                  onClick={() => navigate("/projects")}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Create a project →
                </button>
              </div>
            ) : (
              <>
                {/* Pipeline bar */}
                <div className="mb-6 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                  {Object.entries(data.project_status).map(
                    ([status, count]) => (
                      <div
                        key={status}
                        className={
                          statusMeta[status]?.bar ??
                          "bg-slate-300"
                        }
                        style={{
                          width: `${(count / total) * 100}%`,
                        }}
                      />
                    )
                  )}
                </div>

                {/* Status rows */}
                <div className="space-y-3.5">
                  {Object.entries(data.project_status).map(
                    ([status, count]) => (
                      <div
                        key={status}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              statusMeta[status]?.bar ??
                              "bg-slate-300"
                            }`}
                          />

                          <span className="truncate text-sm text-slate-600">
                            {statusMeta[status]?.label ?? status}
                          </span>
                        </div>

                        <span className="text-sm font-semibold text-slate-900 tabular-nums">
                          {count}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </section>

          {/* ===================================================
              RECENT PROJECTS
          =================================================== */}

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Recent projects
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Latest project activity
                </p>
              </div>

              <button
                onClick={() => navigate("/projects")}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                View all
                <ArrowUpRight size={13} />
              </button>
            </div>

            {data.recent_projects.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm text-slate-500">
                  Nothing yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recent_projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      navigate(`/projects/${p.id}`)
                    }
                    className="group flex w-full items-center justify-between gap-3 py-3 text-left transition-colors first:pt-1 last:pb-1 hover:bg-slate-50/60 sm:py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-xs font-semibold text-slate-500 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                        {p.name
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>

                      <span className="truncate text-sm font-medium text-slate-700 group-hover:text-slate-950">
                        {p.name}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          statusMeta[p.status]?.chip ??
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {statusMeta[p.status]?.label ??
                          p.status}
                      </span>

                      <ArrowUpRight
                        size={13}
                        className="hidden text-slate-300 transition-colors group-hover:text-slate-500 sm:block"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* =====================================================
            LATEST WORK
        ===================================================== */}

        {data.recent_logs &&
          data.recent_logs.length > 0 && (
            <section className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">

              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Latest work
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Recent team activity
                  </p>
                </div>

                <button
                  onClick={() => navigate("/worklogs")}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  View all
                  <ArrowUpRight size={13} />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {data.recent_logs.map((log) => (
                  <div
                    key={log.id}
                    className="py-4 first:pt-1 last:pb-1"
                  >
                    {/* User + date */}
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between">
                      <span className="text-sm font-semibold text-slate-800">
                        {log.user_name ?? "Unknown"}
                      </span>

                      <span className="text-[11px] text-slate-400">
                        {log.log_date}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="mt-1.5 text-sm leading-6 text-slate-600">
                      {log.summary}
                    </p>

                    {/* Technologies */}
                    {log.technologies && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {log.technologies
                          .split(",")
                          .map((t) => (
                            <span
                              key={t}
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500"
                            >
                              {t.trim()}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
      </div>
    </main>
  );
}