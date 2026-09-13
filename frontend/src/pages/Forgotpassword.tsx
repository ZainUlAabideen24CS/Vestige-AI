import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ShieldCheck } from "lucide-react";

import { api } from "../api/clients";
import VestigeLogo from "../components/VestigeLogo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-100/40 blur-3xl" />

        <div className="absolute -bottom-48 -left-24 h-[500px] w-[500px] rounded-full bg-blue-100/50 blur-3xl" />

        <div className="absolute -right-40 top-1/3 h-[450px] w-[450px] rounded-full bg-slate-200/50 blur-3xl" />

        <div className="absolute bottom-[-100px] left-[-20px] h-[300px] w-[300px] rotate-45 border-[45px] border-blue-100/50" />

        <div className="absolute right-[-150px] top-[-100px] h-[350px] w-[350px] rounded-full border border-blue-100/70" />
      </div>

      {/* Main */}
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[430px]">

          {/* =====================================================
              VESTIGE BRAND
          ===================================================== */}
          <div className="mb-7 sm:mb-9">
            <VestigeLogo variant="login" />
          </div>

          {/* =====================================================
              CARD
          ===================================================== */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">

            {/* Header */}
            <div className="mb-7">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Forgot Password
              </h1>

              <p className="mt-1.5 text-sm leading-5 text-slate-500">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            {/* =================================================
                SUCCESS STATE
            ================================================= */}
            {submitted ? (
              <div>
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100">
                      <Mail className="h-4 w-4 text-green-700" />
                    </div>

                    <p className="text-sm leading-5 text-green-800">
                      If an account with that email exists, a reset link has
                      been sent. Please check your inbox.
                    </p>
                  </div>
                </div>

                <Link
                  to="/login"
                  className="mt-5 flex h-11 w-full items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-700/20 transition hover:bg-blue-800 active:bg-blue-900"
                >
                  Back to Login
                </Link>
              </div>
            ) : (
              /* =================================================
                 FORM
              ================================================= */
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
                autoComplete="on"
              >
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />

                    <input
                      id="email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                  className="h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-700/20 transition hover:bg-blue-800 active:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>

                {/* Back */}
                <Link
                  to="/login"
                  className="block text-center text-sm font-medium text-slate-500 transition hover:text-blue-600 hover:underline"
                >
                  Back to Login
                </Link>
              </form>
            )}

            {/* Security */}
            <div className="mt-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />

              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure recovery
              </div>

              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="mt-3 text-center text-[10px] font-medium text-slate-400">
              Powered by Vestige AI
            </p>
          </div>

          {/* Footer */}
          <p className="mt-5 text-center text-xs text-slate-400">
            Business Knowledge Intelligence
          </p>
        </div>
      </div>
    </div>
  );
}