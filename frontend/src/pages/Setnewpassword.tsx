import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ShieldCheck, CheckCircle2 } from "lucide-react";

import { api } from "../api/clients";

/**
 * Shown right after a first-time login when the user still has
 * a temporary password (user.must_reset_password === true).
 *
 * This page intentionally does NOT use Layout, so the user sees
 * no sidebar or dashboard until the password has been changed.
 */

export default function SetNewPassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setSuccess(true);

      // Give the user a moment to see the success message.
      setTimeout(() => {
        navigate("/dashboard");
      }, 1200);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          "Could not update password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50">
      {/* =====================================================
          BACKGROUND DECORATION
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Top-left glow */}
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-100/50 blur-3xl" />

        {/* Bottom-left glow */}
        <div className="absolute -bottom-52 -left-32 h-[550px] w-[550px] rounded-full bg-blue-100/50 blur-3xl" />

        {/* Right glow */}
        <div className="absolute -right-40 top-1/4 h-[500px] w-[500px] rounded-full bg-slate-200/60 blur-3xl" />

        {/* Decorative V-style shapes */}
        <div className="absolute bottom-[-140px] left-[-30px] h-[330px] w-[330px] rotate-45 border-[45px] border-blue-100/50" />

        <div className="absolute right-[-170px] top-[-140px] h-[380px] w-[380px] rounded-full border border-blue-100/70" />

        <div className="absolute right-[-100px] top-[-70px] h-[260px] w-[260px] rounded-full border border-blue-100/40" />
      </div>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[440px]">

          {/* =================================================
              BRAND
          ================================================= */}

          <div className="mb-7 text-center sm:mb-8">

            {/* V Logo */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
              <img
                src="/vestige-icon.png"
                alt="Vestige AI"
                className="h-16 w-16 object-contain drop-shadow-[0_8px_18px_rgba(37,99,235,0.25)]"
              />
            </div>

            {/* Brand Name */}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px]">
              VESTIGE{" "}
              <span className="text-blue-600">AI</span>
            </h1>

            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:text-xs">
              Business Knowledge Intelligence
            </p>
          </div>

          {/* =================================================
              CARD
          ================================================= */}

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-8">

            {/* Header */}
            <div className="mb-7">

              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                <Lock
                  className="h-5 w-5 text-blue-600"
                  strokeWidth={1.8}
                />
              </div>

              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Set a New Password
              </h2>

              <p className="mt-2 text-sm leading-5 text-slate-500">
                For your account's security, please set your own password
                before continuing.
              </p>
            </div>

            {/* =================================================
                SUCCESS STATE
            ================================================= */}

            {success ? (
              <div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2
                        className="h-4 w-4 text-green-700"
                        strokeWidth={2}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        Password updated successfully
                      </p>

                      <p className="mt-1 text-xs leading-5 text-green-700">
                        Your account is ready. Redirecting to your
                        dashboard...
                      </p>
                    </div>

                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="mt-5 h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-700/20 transition hover:bg-blue-800 active:bg-blue-900"
                >
                  Continue to Dashboard
                </button>
              </div>
            ) : (

              /* ===============================================
                 FORM
              ================================================ */

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >

                {/* Current Temporary Password */}
                <div>
                  <label
                    htmlFor="current-password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Current Password
                  </label>

                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400"
                      strokeWidth={1.8}
                    />

                    <input
                      id="current-password"
                      type="password"
                      name="current-password"
                      autoComplete="current-password"
                      placeholder="Enter temporary password"
                      value={currentPassword}
                      onChange={(e) =>
                        setCurrentPassword(e.target.value)
                      }
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      required
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    New Password
                  </label>

                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400"
                      strokeWidth={1.8}
                    />

                    <input
                      id="new-password"
                      type="password"
                      name="new-password"
                      autoComplete="new-password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(e.target.value)
                      }
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      required
                    />
                  </div>

                  <p className="mt-1.5 text-xs text-slate-400">
                    Use at least 8 characters.
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Confirm New Password
                  </label>

                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400"
                      strokeWidth={1.8}
                    />

                    <input
                      id="confirm-password"
                      type="password"
                      name="confirm-password"
                      autoComplete="new-password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      required
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
                    <p className="text-sm leading-5 text-red-600">
                      {error}
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-700/20 transition hover:bg-blue-800 active:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Updating Password..."
                    : "Set Password & Continue"}
                </button>
              </form>
            )}

            {/* =================================================
                SECURITY FOOTER
            ================================================= */}

            <div className="mt-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />

              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                <ShieldCheck
                  className="h-3.5 w-3.5"
                  strokeWidth={1.8}
                />
                Secure account
              </div>

              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
              Powered by Vestige AI
            </p>
          </div>

          {/* Bottom tagline */}
          <p className="mt-5 text-center text-xs text-slate-400">
            Business Knowledge Intelligence
          </p>
        </div>
      </div>
    </div>
  );
}