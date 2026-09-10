import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "../api/clients";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        new_password: newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? "Invalid or expired reset link."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-sm bg-white p-8 rounded-xl border border-slate-200 text-center">
          <p className="text-sm text-red-600 mb-4">
            This reset link is missing a token. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="text-sm text-slate-900 font-medium hover:underline"
          >
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl border border-slate-200">
        <h1 className="text-xl font-medium mb-1">Reset Password</h1>
        <p className="text-sm text-slate-500 mb-6">Enter your new password below.</p>

        {success ? (
          <p className="text-sm text-green-700">
            Password reset successfully. Redirecting to login...
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full mb-3 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full mb-4 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}