import { useEffect, useState } from "react";
import { useCurrentUser } from "../api/hooks/useCurrentUser";

type Role = "admin" | "manager" | "employee";

type Member = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  must_reset_password: boolean;
  created_at: string;
};

export default function Members() {
  const { data: me, isLoading: userLoading } = useCurrentUser();

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ------------------------------------------------------------
  // Load members
  // ------------------------------------------------------------

  async function loadMembers() {
    try {
      setLoadingMembers(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load members");
      }

      const data = await response.json();
      setMembers(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load members"
      );
    } finally {
      setLoadingMembers(false);
    }
  }

  // ------------------------------------------------------------
  // Create member
  // ------------------------------------------------------------

  async function createMember(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (temporaryPassword.length < 8) {
      setError(
        "Temporary password must be at least 8 characters."
      );
      return;
    }

    try {
      setCreating(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: fullName,
            email,
            role,
            temporary_password: temporaryPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Failed to create member"
        );
      }

      setMembers((prev) => [...prev, data]);

      setFullName("");
      setEmail("");
      setRole("employee");
      setTemporaryPassword("");

      setShowForm(false);

      setSuccess(
        "Member created successfully. The temporary password has been sent to their email."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create member"
      );
    } finally {
      setCreating(false);
    }
  }

  // ------------------------------------------------------------
  // Authorization
  // ------------------------------------------------------------

  if (userLoading) {
    return (
      <main className="w-full min-w-0 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-3 py-6 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-7 w-40 bg-slate-200 rounded-lg" />
            <div className="h-4 w-72 bg-slate-100 rounded" />
          </div>
        </div>
      </main>
    );
  }

  if (!me || me.role !== "admin") {
    return (
      <main className="w-full min-w-0 overflow-x-hidden">
        <div className="max-w-xl mx-auto px-3 py-6 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
          <div className="bg-white border border-red-200 rounded-xl p-5 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              Access denied
            </h2>

            <p className="text-sm text-slate-500 mt-2 leading-6">
              Only administrators can manage members.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Load members once admin is confirmed
  useEffect(() => {
    if (me?.role === "admin") {
      loadMembers();
    }
  }, [me]);

  return (
    <main className="w-full min-w-0 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6 sm:mb-8">

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <span className="text-blue-600 text-sm">
                  ✦
                </span>
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Team Management
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              Members
            </h2>

            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Manage users and their access to Vestige AI.
            </p>
          </div>

          <button
            onClick={() => {
              setShowForm(true);
              setError("");
              setSuccess("");
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
          >
            + Add Member
          </button>
        </div>

        {/* ======================================================
            SUCCESS
        ====================================================== */}

        {success && (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 leading-5">
            {success}
          </div>
        )}

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 leading-5">
            {error}
          </div>
        )}

        {/* ======================================================
            ADD MEMBER FORM
        ====================================================== */}

        {showForm && (
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 mb-6">

            {/* Form Header */}
            <div className="flex items-start justify-between gap-4 mb-5 sm:mb-6">

              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">
                  Add new member
                </h3>

                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-5">
                  The member will be required to change their
                  temporary password after first login.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                className="shrink-0 text-sm text-slate-400 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>

            <form
              onSubmit={createMember}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5"
            >
              {/* Full name */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full name
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  placeholder="e.g. Zohaib Ahmed"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Email */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="user@example.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Role */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Role
                </label>

                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as Role)
                  }
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="employee">
                    Employee
                  </option>

                  <option value="manager">
                    Manager
                  </option>

                  <option value="admin">
                    Admin
                  </option>
                </select>
              </div>

              {/* Temporary password */}
              <div className="min-w-0">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Temporary password
                </label>

                <input
                  type="password"
                  value={temporaryPassword}
                  onChange={(e) =>
                    setTemporaryPassword(
                      e.target.value
                    )
                  }
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Submit */}
              <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating
                    ? "Creating..."
                    : "Create Member"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ======================================================
            MEMBERS
        ====================================================== */}

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

          {/* Section Header */}
          <div className="px-4 py-4 sm:px-6 border-b border-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  All members
                </h3>

                <p className="text-xs text-slate-500 mt-0.5">
                  {members.length}{" "}
                  {members.length === 1
                    ? "member"
                    : "members"}
                </p>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loadingMembers ? (
            <div className="p-4 sm:p-6 space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse border border-slate-100 rounded-lg p-4"
                >
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                  <div className="h-3 w-56 bg-slate-100 rounded mt-2" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            /* Empty */
            <div className="p-8 sm:p-10 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <span className="text-slate-500">
                  👤
                </span>
              </div>

              <p className="text-sm font-medium text-slate-700">
                No members found.
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Add your first member to get started.
              </p>
            </div>
          ) : (
            <>
              {/* ==================================================
                  MOBILE CARDS
              ================================================== */}

              <div className="md:hidden divide-y divide-slate-100">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="p-4"
                  >
                    <div className="flex items-start justify-between gap-3">

                      {/* Member Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 break-words">
                          {member.full_name}
                        </p>

                        <p className="text-xs text-slate-500 mt-1 break-all">
                          {member.email}
                        </p>
                      </div>

                      {/* Role */}
                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          member.role === "admin"
                            ? "bg-purple-50 text-purple-700"
                            : member.role === "manager"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {member.role}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">

                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          member.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {member.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>

                      {member.must_reset_password && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                          Password change required
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ==================================================
                  TABLET / DESKTOP
              ================================================== */}

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[650px] text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold text-slate-700">
                        Member
                      </th>

                      <th className="text-left px-6 py-3 font-semibold text-slate-700">
                        Role
                      </th>

                      <th className="text-left px-6 py-3 font-semibold text-slate-700">
                        Status
                      </th>

                      <th className="text-left px-6 py-3 font-semibold text-slate-700">
                        Password
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {members.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              {member.full_name}
                            </p>

                            <p className="text-xs text-slate-500 mt-0.5 break-all">
                              {member.email}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                              member.role === "admin"
                                ? "bg-purple-50 text-purple-700"
                                : member.role ===
                                  "manager"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {member.role}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                              member.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {member.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {member.must_reset_password ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                              Change required
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Updated
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}