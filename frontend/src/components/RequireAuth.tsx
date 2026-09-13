import { Navigate } from "react-router-dom";
import Layout from "./Layout";

interface RequireAuthProps {
  children: React.ReactNode;
  withLayout?: boolean;
}

export default function RequireAuth({
  children,
  withLayout = true,
}: RequireAuthProps) {
  const token = localStorage.getItem("token");

  // User login nahi hai
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Special authenticated pages
  // e.g. Set New Password
  if (!withLayout) {
    return <>{children}</>;
  }

  // Normal application pages
  return <Layout>{children}</Layout>;
}