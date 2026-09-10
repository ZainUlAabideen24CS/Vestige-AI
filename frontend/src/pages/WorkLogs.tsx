import { useState } from "react";

import {
  useWorkLogs,
  useCreateWorkLog,
  type WorkLogInput,
} from "../api/hooks/useWorkLogs";

import { useProjects } from "../api/hooks/useClients";

import Modal from "../components/Modal";

import {
  ClipboardList,
  CalendarDays,
  Clock3,
  Code2,
  AlertTriangle,
  FolderKanban,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 20;

const field =
  "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 placeholder:text-slate-400";


/* =========================================================
   LOG FORM
========================================================= */

function LogForm({
  onSubmit,
  onCancel,
  submitting,
  error,
}: {
  onSubmit: (d: WorkLogInput) => void;
  onCancel: () => void;
  submitting: boolean;
  error: string;
}) {
  const { data: projects } = useProjects({
    limit: 100,
  });

  const [projectId, setProjectId] =
    useState("");

  const [logDate, setLogDate] =
    useState(
      new Date().toISOString().slice(0, 10)
    );

  const [summary, setSummary] =
    useState("");

  const [hours, setHours] =
    useState("");

  const [technologies, setTechnologies] =
    useState("");

  const [blockers, setBlockers] =
    useState("");


  function submit() {
    const data: WorkLogInput = {
      project_id: Number(projectId),
      log_date: logDate,
      summary: summary.trim(),
    };

    if (hours) {
      data.hours = Number(hours);
    }

    if (technologies.trim()) {
      data.technologies =
        technologies.trim();
    }

    if (blockers.trim()) {
      data.blockers =
        blockers.trim();
    }

    onSubmit(data);
  }


  return (
    <div className="space-y-4">

      {/* Project */}

      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Project *
        </label>

        <div className="relative">

          <FolderKanban
            size={16}
            className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
          />

          <select
            value={projectId}
            onChange={(e) =>
              setProjectId(e.target.value)
            }
            className={`${field} appearance-none pl-10`}
          >
            <option value="">
              Select a project...
            </option>

            {projects?.map((p) => (
              <option
                key={p.id}
                value={p.id}
              >
                {p.name}
              </option>
            ))}
          </select>

        </div>
      </div>


      {/* Date + Hours */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Date *
          </label>

          <div className="relative">

            <CalendarDays
              size={16}
              className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
            />

            <input
              type="date"
              value={logDate}
              onChange={(e) =>
                setLogDate(e.target.value)
              }
              className={`${field} pl-10`}
            />

          </div>
        </div>


        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Hours
          </label>

          <div className="relative">

            <Clock3
              size={16}
              className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
            />

            <input
              type="number"
              step="0.5"
              min="0"
              value={hours}
              onChange={(e) =>
                setHours(e.target.value)
              }
              placeholder="e.g. 4.5"
              className={`${field} pl-10`}
            />

          </div>
        </div>

      </div>


      {/* Summary */}

      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          What did you work on? *
        </label>

        <textarea
          rows={4}
          value={summary}
          onChange={(e) =>
            setSummary(e.target.value)
          }
          placeholder="Describe what you worked on..."
          className={`${field} resize-none`}
        />
      </div>


      {/* Technologies */}

      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Technologies used
        </label>

        <div className="relative">

          <Code2
            size={16}
            className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
          />

          <input
            placeholder="FastAPI, Qdrant, React"
            value={technologies}
            onChange={(e) =>
              setTechnologies(
                e.target.value
              )
            }
            className={`${field} pl-10`}
          />

        </div>

        <p className="mt-1.5 text-[11px] text-slate-400">
          Separate multiple technologies with commas.
        </p>
      </div>


      {/* Blockers */}

      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Blockers
        </label>

        <textarea
          rows={3}
          value={blockers}
          onChange={(e) =>
            setBlockers(e.target.value)
          }
          placeholder="Anything that blocked your progress?"
          className={`${field} resize-none`}
        />
      </div>


      {/* Error */}

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">

          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0 text-red-500"
          />

          <p className="text-xs leading-5 text-red-700">
            {error}
          </p>

        </div>
      )}


      {/* Buttons */}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">

        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:w-auto"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={
            submitting ||
            !projectId ||
            !summary.trim()
          }
          className="w-full rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {submitting
            ? "Saving..."
            : "Save work log"}
        </button>

      </div>

    </div>
  );
}


/* =========================================================
   MAIN WORK LOGS PAGE
========================================================= */

export default function WorkLogs() {

  const [page, setPage] =
    useState(0);

  const [showAdd, setShowAdd] =
    useState(false);


  const {
    data,
    isLoading,
    isError,
  } = useWorkLogs({
    skip:
      page * PAGE_SIZE,

    limit:
      PAGE_SIZE,
  });


  const create =
    useCreateWorkLog();


  return (
    <main className="w-full min-w-0 overflow-x-hidden">

      <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            <div className="flex min-w-0 items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                <ClipboardList
                  size={19}
                  strokeWidth={2}
                />

              </div>


              <div className="min-w-0">

                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                  Team Activity
                </p>

                <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                  Work logs
                </h1>

                <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500 sm:text-sm">
                  Track what the team worked on,
                  technologies used, and anything
                  that blocked progress.
                </p>

              </div>

            </div>


            <button
              onClick={() =>
                setShowAdd(true)
              }
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] sm:w-auto"
            >

              <Plus size={16} />

              Log work

            </button>

          </div>

        </div>


        {/* =================================================
            LOADING
        ================================================= */}

        {isLoading && (

          <div className="space-y-3">

            {[1, 2, 3].map((item) => (

              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
              >

                <div className="h-4 w-32 rounded bg-slate-200" />

                <div className="mt-3 h-3 w-52 rounded bg-slate-100" />

                <div className="mt-5 h-4 w-full rounded bg-slate-100" />

                <div className="mt-2 h-4 w-4/5 rounded bg-slate-100" />

              </div>

            ))}

          </div>

        )}


        {/* =================================================
            ERROR
        ================================================= */}

        {isError && (

          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">

            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0 text-red-500"
            />

            <div>

              <p className="text-sm font-semibold text-red-800">
                Could not load work logs.
              </p>

              <p className="mt-1 text-xs text-red-600">
                Please try again later.
              </p>

            </div>

          </div>

        )}


        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {!isLoading &&
          !isError &&
          data &&
          data.length === 0 && (

            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">

                <ClipboardList
                  size={21}
                />

              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                No work logged yet
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                Start recording your team's
                work, technologies, and blockers.
              </p>

              <button
                onClick={() =>
                  setShowAdd(true)
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
              >

                <Plus size={14} />

                Log your first work

              </button>

            </div>

          )}


        {/* =================================================
            WORK LOG CARDS
        ================================================= */}

        {!isLoading &&
          !isError &&
          data &&
          data.length > 0 && (

            <div className="space-y-3">

              {data.map((log) => (

                <article
                  key={log.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5"
                >

                  {/* Top section */}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                    <div className="min-w-0">

                      <div className="flex items-center gap-2">

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">

                          <ClipboardList
                            size={14}
                          />

                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-sm font-semibold text-slate-900">
                            {log.user_name ??
                              "Unknown"}
                          </p>

                        </div>

                      </div>


                      {/* Metadata */}

                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">

                        <span className="inline-flex items-center gap-1">

                          <FolderKanban
                            size={12}
                          />

                          {log.project_name ??
                            `Project ${log.project_id}`}

                        </span>

                        <span className="text-slate-300">
                          •
                        </span>

                        <span className="inline-flex items-center gap-1">

                          <CalendarDays
                            size={12}
                          />

                          {log.log_date}

                        </span>

                        {log.hours && (
                          <>
                            <span className="text-slate-300">
                              •
                            </span>

                            <span className="inline-flex items-center gap-1">

                              <Clock3
                                size={12}
                              />

                              {Number(
                                log.hours
                              )}
                              h

                            </span>
                          </>
                        )}

                      </div>

                    </div>

                  </div>


                  {/* Summary */}

                  <div className="mt-4">

                    <p className="text-sm leading-6 text-slate-700">
                      {log.summary}
                    </p>

                  </div>


                  {/* Technologies */}

                  {log.technologies && (

                    <div className="mt-4">

                      <div className="mb-2 flex items-center gap-1.5">

                        <Code2
                          size={13}
                          className="text-slate-400"
                        />

                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Technologies
                        </span>

                      </div>

                      <div className="flex flex-wrap gap-1.5">

                        {log.technologies
                          .split(",")
                          .map((t) => (

                            <span
                              key={t}
                              className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700"
                            >
                              {t.trim()}
                            </span>

                          ))}

                      </div>

                    </div>

                  )}


                  {/* Blockers */}

                  {log.blockers && (

                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">

                      <AlertTriangle
                        size={15}
                        className="mt-0.5 shrink-0 text-amber-600"
                      />

                      <div className="min-w-0">

                        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                          Blocker
                        </p>

                        <p className="mt-0.5 text-xs leading-5 text-amber-800">
                          {log.blockers}
                        </p>

                      </div>

                    </div>

                  )}

                </article>

              ))}

            </div>

          )}


        {/* =================================================
            PAGINATION
        ================================================= */}

        {!isLoading &&
          !isError &&
          data &&
          data.length > 0 && (

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-center text-xs text-slate-500 sm:text-left">
                Page{" "}
                <span className="font-semibold text-slate-700">
                  {page + 1}
                </span>
              </p>


              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">

                <button
                  onClick={() =>
                    setPage((p) =>
                      Math.max(0, p - 1)
                    )
                  }
                  disabled={page === 0}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >

                  <ChevronLeft
                    size={14}
                  />

                  Previous

                </button>


                <button
                  onClick={() =>
                    setPage((p) => p + 1)
                  }
                  disabled={
                    !data ||
                    data.length < PAGE_SIZE
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >

                  Next

                  <ChevronRight
                    size={14}
                  />

                </button>

              </div>

            </div>

          )}


        {/* =================================================
            MODAL
        ================================================= */}

        <Modal
          open={showAdd}
          title="Log work"
          onClose={() =>
            setShowAdd(false)
          }
        >

          <LogForm
            submitting={
              create.isPending
            }

            error={
              create.isError
                ? "Could not save. You may not be assigned to that project."
                : ""
            }

            onSubmit={(d) =>
              create.mutate(d, {
                onSuccess: () =>
                  setShowAdd(false),
              })
            }

            onCancel={() =>
              setShowAdd(false)
            }
          />

        </Modal>

      </div>

    </main>
  );
}