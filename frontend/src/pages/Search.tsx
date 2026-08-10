import { useState } from "react";
import { useSearch, useAsk } from "../api/hooks/useIngestion";
import { useClients } from "../api/hooks/useClients";

const field = "px-3 py-2 border border-slate-300 rounded-lg text-sm";

export default function Search() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [mode, setMode] = useState<"ask" | "search">("ask");

  const { data: clients } = useClients({ limit: 100 });
  const search = useSearch(mode === "search" ? query : "", clientId ? Number(clientId) : undefined);
  const ask = useAsk();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (q.length < 3) return;

    if (mode === "ask") {
      ask.mutate({ question: q, clientId: clientId ? Number(clientId) : undefined });
    } else {
      setQuery(q);
    }
  }

  function scoreColor(score: number) {
    if (score >= 0.7) return "bg-green-100 text-green-800";
    if (score >= 0.55) return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-600";
  }

  const hits = mode === "ask" ? ask.data?.sources : search.data?.hits;
  const busy = mode === "ask" ? ask.isPending : search.isFetching;

  return (
    <main className="p-8 max-w-4xl">
      <h2 className="text-xl font-medium mb-1">Search</h2>
      <p className="text-sm text-slate-500 mb-5">
        Ask a question in plain language. Answers come only from ingested documents.
      </p>

      <div className="flex gap-2 mb-4">
        {(["ask", "search"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              mode === m ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600"
            }`}
          >
            {m === "ask" ? "Answer" : "Passages"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Why did they reject Auth0?"
          className={`${field} flex-1`}
        />
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={field}>
          <option value="">All clients</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>{c.company_name}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={input.trim().length < 3 || busy}
          className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm disabled:opacity-40"
        >
          {busy ? "Thinking..." : mode === "ask" ? "Ask" : "Search"}
        </button>
      </form>

      {busy && mode === "ask" && (
        <p className="text-sm text-slate-500 mb-4">
          Generating an answer — this can take up to a minute on CPU.
        </p>
      )}

      {ask.isError && mode === "ask" && (
        <p className="text-sm text-red-600 mb-4">Request failed or timed out. Is Ollama running?</p>
      )}

      {mode === "ask" && ask.data && !ask.isPending && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <p className="text-xs text-slate-500 mb-2">Answer</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{ask.data.answer}</p>
        </div>
      )}

      {hits && hits.length > 0 && (
        <>
          <p className="text-sm text-slate-500 mb-3">
            {mode === "ask" ? "Sources" : `${hits.length} result${hits.length === 1 ? "" : "s"}`}
          </p>
          <div className="space-y-3">
            {hits.map((hit, i) => (
              <div
                key={`${hit.document_id}-${hit.chunk_index}-${i}`}
                className="bg-white border border-slate-200 rounded-xl p-5"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-500">
                    {hit.filename ?? "Unknown file"}
                    {hit.chunk_index !== null && ` · chunk ${hit.chunk_index}`}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${scoreColor(hit.score)}`}>
                    {(hit.score * 100).toFixed(0)}% match
                  </span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {hit.text}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {hits && hits.length === 0 && !busy && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm text-slate-500">Nothing relevant found.</p>
        </div>
      )}
    </main>
  );
}