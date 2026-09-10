import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Upload,
  Search,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

import { useCurrentUser } from "../api/hooks/useCurrentUser";

const navItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/clients",
    label: "Clients",
    icon: Users,
  },
  {
    to: "/projects",
    label: "Projects",
    icon: FolderKanban,
  },
  {
    to: "/ingest",
    label: "Ingest",
    icon: Upload,
  },
  {
    to: "/search",
    label: "Search",
    icon: Search,
  },
  {
    to: "/worklogs",
    label: "Work Logs",
    icon: ClipboardList,
  },
];

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: me, isLoading } = useCurrentUser();

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  function signOut() {
    localStorage.removeItem("token");
    queryClient.clear();
    navigate("/login");
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  const initials =
    me?.full_name
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile Header */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-950">
            Vestige <span className="text-blue-600">AI</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Business Intelligence
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <button
          type="button"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
          aria-label="Close navigation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="border-b border-slate-100 px-6 py-5">
          <h1 className="text-xl font-bold tracking-tight text-slate-950">
            Vestige <span className="text-blue-600">AI</span>
          </h1>

          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
            Business Intelligence
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-[18px] w-[18px] ${
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-slate-700"
                      }`}
                      strokeWidth={1.8}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Admin-only Members Link */}
          {!isLoading && me?.role === "admin" && (
            <>
              <p className="mb-3 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Administration
              </p>

              <NavLink
                to="/members"
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Users
                      className={`h-[18px] w-[18px] ${
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-slate-700"
                      }`}
                      strokeWidth={1.8}
                    />
                    <span>Members</span>
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        {/* Sidebar Bottom */}
        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 rounded-xl bg-slate-50 px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {initials}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {me?.full_name || "User"}
                </p>

                <p className="truncate text-xs capitalize text-slate-500">
                  {me?.role || "User"}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="lg:pl-64">
        {/* Desktop Topbar */}
        <header className="hidden h-16 items-center justify-between border-b border-slate-200 bg-white px-8 lg:flex">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Business Knowledge Workspace
            </p>
            <p className="text-xs text-slate-400">
              Manage your clients, projects and business intelligence
            </p>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {initials}
              </div>

              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800">
                  {me?.full_name || "User"}
                </p>
                <p className="text-xs capitalize text-slate-500">
                  {me?.role || "User"}
                </p>
              </div>

              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)] pt-16 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}