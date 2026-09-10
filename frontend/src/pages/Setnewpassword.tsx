import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/clients";

/**
 * Shown right after a first-time login when the user still has a
 * temporary password (user.must_reset_password === true). Uses the
 * authenticated /auth/change-password endpoint (not the emailed
 * reset-token flow), since the user is already logged in.
 */
export default function SetNewPassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
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
      navigate("/clients");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? "Could not update password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl border border-slate-200">
        <h1 className="text-xl font-medium mb-1">Set a New Password</h1>
        <p className="text-sm text-slate-500 mb-6">
          For your account's security, please set your own password before continuing.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Current (temporary) password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full mb-3 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            required
          />
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
            {loading ? "Updating..." : "Set Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}