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
import VestigeLogo from "../components/VestigeLogo";

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
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-slate-50 text-slate-900">
      {/* =========================================================
          MOBILE HEADER
      ========================================================= */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <VestigeLogo variant="mobile" showTagline={false} />

        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </header>

      {/* =========================================================
          MOBILE OVERLAY
      ========================================================= */}
      {mobileMenuOpen && (
        <button
          type="button"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[1px] lg:hidden"
          aria-label="Close navigation"
        />
      )}

      {/* =========================================================
          SIDEBAR
      ========================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col bg-[#071a31] shadow-2xl transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo Area */}
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex min-h-[105px] items-center justify-center rounded-xl bg-[#0a203a] px-3 py-4">
            <VestigeLogo variant="sidebar" showTagline={true} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Workspace
          </p>

          <div className="space-y-1">
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
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`h-[18px] w-[18px] ${
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-slate-200"
                        }`}
                        strokeWidth={1.8}
                      />

                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Admin */}
          {!isLoading && me?.role === "admin" && (
            <>
              <p className="mb-3 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Administration
              </p>

              <NavLink
                to="/members"
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Users
                      className={`h-[18px] w-[18px] ${
                        isActive
                          ? "text-white"
                          : "text-slate-500 group-hover:text-slate-200"
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

        {/* =========================================================
            SIDEBAR BOTTOM
        ========================================================= */}
        <div className="border-t border-white/10 p-3">
          <div className="mb-2 rounded-xl bg-white/5 px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-300">
                {initials}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {me?.full_name || "User"}
                </p>

                <p className="truncate text-xs capitalize text-slate-400">
                  {me?.role || "User"}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />

            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* =========================================================
          MAIN AREA
      ========================================================= */}
      <div className="lg:pl-64">
        {/* =======================================================
            DESKTOP TOPBAR
        ======================================================= */}
        <header className="hidden h-16 items-center justify-between border-b border-slate-200 bg-white px-8 lg:flex">
          {/* Left */}
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Business Knowledge Workspace
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              Manage your clients, projects and business intelligence
            </p>
          </div>

          {/* Right */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-50"
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {initials}
              </div>

              {/* User */}
              <div className="text-left">
                <p className="max-w-[180px] truncate text-sm font-semibold text-slate-800">
                  {me?.full_name || "User"}
                </p>

                <p className="text-xs capitalize text-slate-500">
                  {me?.role || "User"}
                </p>
              </div>

              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Profile Menu */}
            {profileOpen && (
              <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />

                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* =======================================================
            PAGE CONTENT
        ======================================================= */}
        <main className="min-h-[calc(100vh-4rem)] pt-16 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}