import { useNavigate } from "react-router-dom";
import { useDashboard } from "../api/hooks/useDashboard";
import { useCurrentUser } from "../api/hooks/useCurrentUser";

const statusStyles: Record<string, string> = {
  planning: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-medium">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError } = useDashboard();
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();

  if (isLoading) return <p className="p-8 text-sm text-slate-500">Loading...</p>;
  if (isError || !data)
    return <p className="p-8 text-sm text-red-600">Could not load dashboard.</p>;

  return (
    <main className="p-8 max-w-5xl">
      <h2 className="text-xl font-medium mb-1">
        {me ? `Welcome back, ${me.full_name.split(" ")[0]}` : "Dashboard"}
      </h2>
      <p className="text-sm text-slate-500 mb-6">Everything the team has captured so far.</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat label="Clients" value={data.clients} sub={`${data.active_clients} active`} />
        <Stat label="Projects" value={data.projects} />
        <Stat label="Documents" value={data.documents} sub={`${data.meetings} meetings`} />
        <Stat label="Searchable chunks" value={data.chunks} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-medium mb-3">Projects by status</h3>
          {Object.keys(data.project_status).length === 0 && (
            <p className="text-sm text-slate-500">No projects yet.</p>
          )}
          <div className="space-y-2">
            {Object.entries(data.project_status).map(([status, count]) => {
              const pct = data.projects ? (count / data.projects) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{status}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-medium mb-3">Recent projects</h3>
          {data.recent_projects.length === 0 && (
            <p className="text-sm text-slate-500">Nothing yet.</p>
          )}
          <div className="space-y-2">
            {data.recent_projects.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="flex justify-between items-center py-1.5 cursor-pointer hover:bg-slate-50 rounded px-2 -mx-2"
              >
                <span className="text-sm">{p.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    statusStyles[p.status] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}