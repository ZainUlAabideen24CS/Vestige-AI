import { useState, useEffect } from "react";
import { useSearch, useAsk } from "../api/hooks/useIngestion";
import { useClients } from "../api/hooks/useClients";
import { api } from "../api/clients";

import type { SearchHit } from "../types";

import {
  Search as SearchIcon,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building2,
  FolderKanban,
} from "lucide-react";

const PASSAGE_PREVIEW_CHARS = 220;

export default function Search() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");

  const [projects, setProjects] = useState<
    { id: number; name: string }[]
  >([]);

  const [mode, setMode] = useState<"ask" | "search">("ask");

  const [expanded, setExpanded] = useState<
    Record<number, boolean>
  >({});

  const { data: clients } = useClients({
    limit: 100,
  });

  const search = useSearch(
    mode === "search" ? query : "",
    clientId ? Number(clientId) : undefined,
    projectId ? Number(projectId) : undefined
  );

  const ask = useAsk();

  /* =========================================================
     LOAD PROJECTS WHEN CLIENT CHANGES
  ========================================================= */

  useEffect(() => {
    if (clientId) {
      api
        .get(`/projects/dropdown?client_id=${clientId}`)
        .then((res) => setProjects(res.data))
        .catch(() => setProjects([]));

      setProjectId("");
    } else {
      setProjects([]);
      setProjectId("");
    }
  }, [clientId]);

  /* =========================================================
     SUBMIT
  ========================================================= */

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const q = input.trim();

    // Client and project are mandatory
    if (!clientId || !projectId) {
      return;
    }

    // Question/search text is mandatory
    if (q.length < 3) {
      return;
    }

    setExpanded({});

    if (mode === "ask") {
      ask.mutate({
        question: q,
        clientId: Number(clientId),
        projectId: Number(projectId),
      });
    } else {
      setQuery(q);
    }
  }

  /* =========================================================
     EXPAND / COLLAPSE
  ========================================================= */

  function toggleExpanded(i: number) {
    setExpanded((prev) => ({
      ...prev,
      [i]: !prev[i],
    }));
  }

  /* =========================================================
     SCORE
  ========================================================= */

  function displayScore(hit: SearchHit): number {
    if (typeof hit.relevance === "number") {
      return hit.relevance;
    }

    return Math.round((hit.score ?? 0) * 100);
  }

  function scoreColor(pct: number) {
    if (pct >= 75) {
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    }

    if (pct >= 55) {
      return "bg-amber-50 text-amber-700 ring-amber-100";
    }

    return "bg-slate-100 text-slate-600 ring-slate-200";
  }

  /* =========================================================
     RESULTS
  ========================================================= */

  const hits =
    mode === "ask"
      ? ask.data?.sources
      : search.data?.hits;

  const busy =
    mode === "ask"
      ? ask.isPending
      : search.isFetching;

  const canSearch =
    input.trim().length >= 3 &&
    clientId !== "" &&
    projectId !== "" &&
    !busy;

  return (
    <main className="w-full min-w-0 overflow-x-hidden">
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <div className="mb-5 sm:mb-7">

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Sparkles
                size={18}
                strokeWidth={2}
              />
            </div>

            <div className="min-w-0">

              <div className="mb-1 flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                  Vestige Intelligence
                </span>
              </div>

              <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                Project Search
              </h1>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Ask questions or find specific passages from
                your project knowledge.
              </p>

            </div>

          </div>

        </div>

        {/* =====================================================
            SEARCH MODE SWITCHER
        ===================================================== */}

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:inline-flex">

          <div className="grid grid-cols-2 gap-1 sm:flex">

            <button
              type="button"
              onClick={() => setMode("ask")}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all sm:text-sm ${
                mode === "ask"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Sparkles size={14} />

              AI Answer
            </button>

            <button
              type="button"
              onClick={() => setMode("search")}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all sm:text-sm ${
                mode === "search"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <FileText size={14} />

              Passages
            </button>

          </div>

        </div>

        {/* =====================================================
            SEARCH FORM
        ===================================================== */}

        <form
          onSubmit={handleSubmit}
          className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:p-5"
        >

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">

            {/* =================================================
                QUESTION
            ================================================= */}

            <div className="lg:col-span-5">

              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {mode === "ask"
                  ? "Question"
                  : "Search query"}
              </label>

              <div className="relative">

                {mode === "ask" ? (
                  <Sparkles
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
                  />
                ) : (
                  <SearchIcon
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
                  />
                )}

                <input
                  value={input}
                  onChange={(e) =>
                    setInput(e.target.value)
                  }
                  placeholder={
                    mode === "ask"
                      ? "Ask a question..."
                      : "Search for keywords..."
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />

              </div>

            </div>

            {/* =================================================
                CLIENT
            ================================================= */}

            <div className="lg:col-span-3">

              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Client
              </label>

              <div className="relative">

                <Building2
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
                />

                <select
                  value={clientId}
                  onChange={(e) =>
                    setClientId(e.target.value)
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-9 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">
                    Select Client
                  </option>

                  {clients?.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.company_name}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3.5 top-3.5 text-slate-400"
                />

              </div>

            </div>

            {/* =================================================
                PROJECT
            ================================================= */}

            <div className="lg:col-span-4">

              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Project
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
                  disabled={!clientId}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-9 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {clientId
                      ? "Select Project"
                      : "Choose Client First"}
                  </option>

                  {projects.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                    >
                      {p.name}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3.5 top-3.5 text-slate-400"
                />

              </div>

            </div>

            {/* =================================================
                SUBMIT BUTTON
            ================================================= */}

            <div className="lg:col-span-12">

              <button
                type="submit"
                disabled={!canSearch}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                  canSearch
                    ? "bg-slate-950 text-white shadow-sm hover:bg-slate-800 active:scale-[0.99]"
                    : "cursor-not-allowed bg-slate-100 text-slate-400"
                }`}
              >

                {busy ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />

                    Processing...
                  </>
                ) : mode === "ask" ? (
                  <>
                    <Sparkles size={16} />

                    Get AI Answer
                  </>
                ) : (
                  <>
                    <SearchIcon size={16} />

                    Search Passages
                  </>
                )}

              </button>

            </div>

          </div>

        </form>

        {/* =====================================================
            SELECTION WARNING
        ===================================================== */}

        {!clientId && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">

            <AlertCircle
              size={15}
              className="mt-0.5 shrink-0 text-slate-400"
            />

            <p className="text-xs leading-5 text-slate-500">
              Please select a client and project before
              searching.
            </p>

          </div>
        )}

        {clientId && !projectId && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">

            <AlertCircle
              size={15}
              className="mt-0.5 shrink-0 text-slate-400"
            />

            <p className="text-xs leading-5 text-slate-500">
              Please select a project before searching.
            </p>

          </div>
        )}

        {/* =====================================================
            AI ANSWER
        ===================================================== */}

        {mode === "ask" && ask.data && (
          <section className="mb-5 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-blue-50 bg-blue-50/50 px-4 py-3.5 sm:px-5">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Sparkles size={16} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  AI Answer
                </p>

                <p className="mt-0.5 text-[11px] text-slate-400">
                  Generated from your project knowledge
                </p>
              </div>

            </div>

            {/* Answer */}
            <div className="px-4 py-4 sm:px-5 sm:py-5">

              <div className="text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                {ask.data.answer}
              </div>

            </div>

          </section>
        )}

        {/* =====================================================
            SOURCES / PASSAGES
        ===================================================== */}

        {hits && hits.length > 0 && (
          <section>

            <div className="mb-3 flex items-center justify-between gap-3">

              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {mode === "ask"
                    ? "Sources Used"
                    : "Matching Passages"}
                </h2>

                <p className="mt-0.5 text-[11px] text-slate-400">
                  {hits.length} result
                  {hits.length !== 1 ? "s" : ""} found
                </p>

              </div>

              <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 sm:flex">
                <FileText size={15} />
              </div>

            </div>

            <div className="space-y-3">

              {hits.map(
                (hit: SearchHit, i: number) => {

                  const pct =
                    displayScore(hit);

                  const isLong =
                    hit.text.length >
                    PASSAGE_PREVIEW_CHARS;

                  const isOpen =
                    expanded[i];

                  const shownText =
                    isLong && !isOpen
                      ? hit.text
                          .slice(
                            0,
                            PASSAGE_PREVIEW_CHARS
                          )
                          .trimEnd() + "…"
                      : hit.text;

                  return (
                    <article
                      key={i}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
                    >

                      {/* Source header */}
                      <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

                        <div className="flex min-w-0 items-center gap-2.5">

                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <FileText size={13} />
                          </div>

                          <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[11px]">
                            {hit.filename ||
                              "Project source"}
                          </span>

                        </div>

                        <span
                          className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ${scoreColor(
                            pct
                          )}`}
                        >
                          {pct}% match
                        </span>

                      </div>

                      {/* Passage */}
                      <div className="px-4 py-4 sm:px-5">

                        <div className="relative">

                          <span className="absolute -left-1 -top-2 text-xl font-serif text-slate-200">
                            “
                          </span>

                          <p className="pl-3 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                            {shownText}
                          </p>

                        </div>

                        {isLong && (
                          <button
                            type="button"
                            onClick={() =>
                              toggleExpanded(i)
                            }
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                          >
                            {isOpen
                              ? "Show less"
                              : "Show full passage"}

                            {isOpen ? (
                              <ChevronUp
                                size={13}
                              />
                            ) : (
                              <ChevronDown
                                size={13}
                              />
                            )}
                          </button>
                        )}

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          </section>
        )}

        {/* =====================================================
            NO RESULTS
        ===================================================== */}

        {!busy &&
          input.trim().length >= 3 &&
          clientId &&
          projectId &&
          ((mode === "ask" &&
            ask.data &&
            (!ask.data.sources ||
              ask.data.sources.length === 0)) ||
            (mode === "search" &&
              search.data &&
              (!search.data.hits ||
                search.data.hits.length === 0))) && (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <SearchIcon size={21} />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                No matching results
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                Try a different question or search phrase
                within this project.
              </p>

            </div>
          )}

      </div>
    </main>
  );
}