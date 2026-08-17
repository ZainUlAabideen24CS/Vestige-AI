import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  useProjects,
  useCreateProject,
} from "../api/hooks/useClients";

import {
  useCurrentUser,
} from "../api/hooks/useCurrentUser";

import Modal from "../components/Modal";
import ProjectForm from "../components/ProjectForm";


const PAGE_SIZE = 10;


const statusStyles: Record<
  string,
  string
> = {
  planning:
    "bg-amber-100 text-amber-800",

  in_progress:
    "bg-blue-100 text-blue-800",

  completed:
    "bg-green-100 text-green-800",
};


export default function Projects() {

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(0);

  const [
    showAdd,
    setShowAdd,
  ] = useState(false);

  const navigate =
    useNavigate();

  const {
    data: me,
  } = useCurrentUser();

  const createProject =
    useCreateProject();

  const canSeeBudget =
    me?.role === "admin" ||
    me?.role === "manager";

  const canEdit =
    me?.role === "admin" ||
    me?.role === "manager";

  const {
    data,
    isLoading,
    isError,
  } = useProjects({
    q:
      search || undefined,

    skip:
      page * PAGE_SIZE,

    limit:
      PAGE_SIZE,
  });


  function handleSearch(
    value: string
  ) {
    setSearch(value);
    setPage(0);
  }


  return (
    <main className="p-8">

      <div className="flex justify-between items-center mb-4">

        <h2 className="text-xl font-medium">
          Projects
        </h2>

        <div className="flex gap-3">

          <input
            placeholder="Search by name..."
            value={search}
            onChange={(e) =>
              handleSearch(
                e.target.value
              )
            }
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-64"
          />

          {canEdit && (
            <button
              onClick={() =>
                setShowAdd(true)
              }
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm whitespace-nowrap"
            >
              Add project
            </button>
          )}

        </div>
      </div>


      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

        {isLoading && (
          <p className="p-6 text-sm text-slate-500">
            Loading...
          </p>
        )}

        {isError && (
          <p className="p-6 text-sm text-red-600">
            Failed to load projects.
          </p>
        )}

        {data &&
          data.length === 0 && (
            <p className="p-6 text-sm text-slate-500">
              No projects found.
            </p>
          )}


        {data &&
          data.length > 0 && (

            <table className="w-full text-sm">

              <thead className="bg-slate-50 border-b border-slate-200">

                <tr>

                  <th className="text-left px-4 py-3 font-medium">
                    Project
                  </th>

                  <th className="text-left px-4 py-3 font-medium">
                    Tech stack
                  </th>

                  {canSeeBudget && (
                    <th className="text-left px-4 py-3 font-medium">
                      Budget
                    </th>
                  )}

                  <th className="text-left px-4 py-3 font-medium">
                    Status
                  </th>

                </tr>

              </thead>


              <tbody>

                {data.map((p) => (

                  <tr
                    key={p.id}
                    onClick={() =>
                      navigate(
                        `/clients/${p.client_id}`
                      )
                    }
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                  >

                    <td className="px-4 py-3">
                      {p.name}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {p.tech_stack ?? "—"}
                    </td>

                    {canSeeBudget && (
                      <td className="px-4 py-3 text-slate-600">
                        {p.budget
                          ? Number(
                              p.budget
                            ).toLocaleString()
                          : "—"}
                      </td>
                    )}

                    <td className="px-4 py-3">

                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          statusStyles[
                            p.status
                          ] ??
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {p.status}
                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

      </div>


      <div className="flex items-center gap-3 mt-4">

        <button
          onClick={() =>
            setPage((p) =>
              Math.max(
                0,
                p - 1
              )
            )
          }
          disabled={page === 0}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-40"
        >
          Previous
        </button>


        <span className="text-sm text-slate-500">
          Page {page + 1}
        </span>


        <button
          onClick={() =>
            setPage((p) =>
              p + 1
            )
          }
          disabled={
            !data ||
            data.length <
              PAGE_SIZE
          }
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-40"
        >
          Next
        </button>

      </div>


      <Modal
        open={showAdd}
        title="Add project"
        onClose={() =>
          setShowAdd(false)
        }
      >

        <ProjectForm
          submitting={
            createProject.isPending
          }

          error={
            createProject.isError
              ? "Could not save. Check the fields and try again."
              : ""
          }

          onSubmit={(data) =>
            createProject.mutate(
              data,
              {
                onSuccess: () =>
                  setShowAdd(
                    false
                  ),
              }
            )
          }

          onCancel={() =>
            setShowAdd(false)
          }
        />

      </Modal>

    </main>
  );
}