import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/clients";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body = new URLSearchParams();
      body.append("username", email);
      body.append("password", password);

      const res = await api.post("/auth/login", body);

      localStorage.setItem("token", res.data.access_token);

      if ("PasswordCredential" in window) {
        try {
          const cred = new (window as any).PasswordCredential({
            id: email,
            password: password,
          });

          await navigator.credentials.store(cred);
        } catch {
          // browser declined — not an error
        }
      }

      if (res.data.must_reset_password) {
        navigate("/set-new-password");
      } else {
        navigate("/dashboard");
      }
    } catch {
      setError("Incorrect email or password");
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

        {/* Login Card */}
        <div className="w-full bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 md:p-8">
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
              Welcome back
            </h2>

            <p className="text-sm text-slate-500 mt-1.5">
              Sign in to continue to your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
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
                name="username"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-w-0 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs sm:text-sm font-medium text-slate-500 hover:text-blue-600 hover:underline transition"
                >
                  Forgot password?
                </Link>
              </div>

              <input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-w-0 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
                <p className="text-sm text-red-600 leading-5">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 active:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-5 sm:mt-6 px-2">
          Secure access powered by Vestige AI
        </p>
      </div>
    </div>
  );
}