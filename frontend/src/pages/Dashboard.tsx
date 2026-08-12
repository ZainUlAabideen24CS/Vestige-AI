import { useNavigate } from "react-router-dom";
import { Users, FolderKanban, FileText, Sparkles, ArrowUpRight, type LucideIcon } from "lucide-react";
import { useDashboard } from "../api/hooks/useDashboard";
import { useCurrentUser } from "../api/hooks/useCurrentUser";

const statusMeta: Record<string, { label: string; bar: string; chip: string }> = {
  planning: { label: "Planning", bar: "bg-amber-400", chip: "bg-amber-50 text-amber-700" },
  in_progress: { label: "In progress", bar: "bg-blue-500", chip: "bg-blue-50 text-blue-700" },
  completed: { label: "Completed", bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
};

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 transition-colors">
      <div className={`w-9 h-9 rounded-xl ${accent} flex items-center justify-center mb-4`}>
        <Icon size={17} strokeWidth={2} />
      </div>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="text-sm text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError } = useDashboard();
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();

  if (isLoading)
    return (
      <main className="p-10">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </main>
    );

  if (isError || !data)
    return <p className="p-10 text-sm text-red-600">Could not load dashboard.</p>;

  const total = data.projects || 1;

  return (
    <main className="p-10 max-w-6xl">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          {me ? `Good to see you, ${me.full_name.split(" ")[0]}` : "Dashboard"}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {data.chunks > 0
            ? `${data.chunks} searchable passages across ${data.documents + data.meetings} sources.`
            : "Nothing ingested yet — upload a document to start building the knowledge base."}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <Stat
          icon={Users}
          label="Clients"
          value={data.clients}
          sub={`${data.active_clients} active`}
          accent="bg-violet-50 text-violet-600"
        />
        <Stat
          icon={FolderKanban}
          label="Projects"
          value={data.projects}
          sub={`${data.project_status.in_progress ?? 0} in progress`}
          accent="bg-blue-50 text-blue-600"
        />
        <Stat
          icon={FileText}
          label="Sources"
          value={data.documents + data.meetings}
          sub={`${data.meetings} recordings`}
          accent="bg-amber-50 text-amber-600"
        />
        <Stat
          icon={Sparkles}
          label="Searchable passages"
          value={data.chunks}
          accent="bg-emerald-50 text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6">
          <h3 className="text-sm font-medium mb-5">Project pipeline</h3>

          {Object.keys(data.project_status).length === 0 ? (
            <p className="text-sm text-slate-500">No projects yet.</p>
          ) : (
            <>
              <div className="flex h-2 rounded-full overflow-hidden mb-5">
                {Object.entries(data.project_status).map(([status, count]) => (
                  <div
                    key={status}
                    className={statusMeta[status]?.bar ?? "bg-slate-300"}
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                ))}
              </div>

              <div className="space-y-3">
                {Object.entries(data.project_status).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full ${statusMeta[status]?.bar ?? "bg-slate-300"}`}
                      />
                      <span className="text-sm text-slate-600">
                        {statusMeta[status]?.label ?? status}
                      </span>
                    </div>
                    <span className="text-sm font-medium tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="col-span-3 bg-white border border-slate-200/80 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium">Recent projects</h3>
            <button
              onClick={() => navigate("/projects")}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
            >
              View all <ArrowUpRight size={13} />
            </button>
          </div>

          {data.recent_projects.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recent_projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="flex justify-between items-center py-2.5 cursor-pointer group"
                >
                  <span className="text-sm group-hover:text-slate-900 text-slate-700">
                    {p.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      statusMeta[p.status]?.chip ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {statusMeta[p.status]?.label ?? p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.recent_logs && data.recent_logs.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium">Latest work</h3>
            <button
              onClick={() => navigate("/worklogs")}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
            >
              View all <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {data.recent_logs.map((log) => (
              <div key={log.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-medium">{log.user_name ?? "Unknown"}</span>
                  <span className="text-xs text-slate-400">{log.log_date}</span>
                </div>
                <p className="text-sm text-slate-600 mb-1.5">{log.summary}</p>
                {log.technologies && (
                  <div className="flex flex-wrap gap-1">
                    {log.technologies.split(",").map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 bg-slate-50 border border-slate-200/60 rounded text-xs text-slate-500"
                      >
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}