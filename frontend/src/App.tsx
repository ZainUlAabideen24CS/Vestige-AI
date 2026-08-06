import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import RequireAuth from "./components/RequireAuth";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/clients"
          element={
            <RequireAuth>
              <Clients />
            </RequireAuth>
          }
        />

        <Route
          path="/clients/:id"
          element={
            <RequireAuth>
              <ClientDetail />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/clients" replace />} />
      </Routes>
    </BrowserRouter>
  );
}