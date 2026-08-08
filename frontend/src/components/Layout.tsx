import { NavLink, useNavigate } from "react-router-dom";
import { useCurrentUser } from "../api/hooks/useCurrentUser";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/clients", label: "Clients" },
  { to: "/projects", label: "Projects" },
  { to: "/ingest", label: "Ingest" },
  { to: "/search", label: "Search" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();

  function signOut() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-100">
          <h1 className="text-lg font-medium">Vestige AI</h1>
          {me && (
            <p className="text-xs text-slate-500 mt-0.5">
              {me.full_name} · {me.role}
            </p>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={signOut}
            className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}