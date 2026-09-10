import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/clients";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch {
      // Backend intentionally returns a generic success message even
      // if the email doesn't exist, but handle network/server errors.
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-slate-50 flex items-center justify-center px-4 py-6 sm:px-6">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-sm mb-3">
            V
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            Vestige AI
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Business Knowledge Intelligence
          </p>
        </div>

        {/* Card */}
        <div className="w-full bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 md:p-8">
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
              Forgot Password
            </h2>

            <p className="text-sm text-slate-500 mt-1.5 leading-5">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {submitted ? (
            <div>
              <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm leading-5 text-green-800">
                  If an account with that email exists, a reset link has been
                  sent. Please check your inbox.
                </p>
              </div>

              <Link
                to="/login"
                className="block w-full text-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 active:bg-slate-950"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Email Address
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-w-0 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
                  <p className="text-sm text-red-600 leading-5">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 active:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <Link
                to="/login"
                className="block text-center text-sm font-medium text-slate-500 transition hover:text-slate-900 hover:underline"
              >
                Back to Login
              </Link>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-5 sm:mt-6 px-2">
          Secure account recovery powered by Vestige AI
        </p>
      </div>
    </div>
  );
}