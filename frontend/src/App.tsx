import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Ingest from "./pages/Ingest";
import RequireAuth from "./components/RequireAuth";
import Search from "./pages/Search";
import Dashboard from "./pages/Dashboard";

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

        <Route
          path="/projects"
          element={
            <RequireAuth>
              <Projects />
            </RequireAuth>
          }
        />

        <Route
          path="/projects/:id"
          element={
            <RequireAuth>
              <ProjectDetail />
            </RequireAuth>
          }
        />

        <Route
          path="/ingest"
          element={
            <RequireAuth>
              <Ingest />
            </RequireAuth>
          }
        />

        <Route
  path="/search"
  element={
    <RequireAuth>
      <Search />
    </RequireAuth>
  }
/>

<Route
  path="/dashboard"
  element={
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  }
/>

       <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}