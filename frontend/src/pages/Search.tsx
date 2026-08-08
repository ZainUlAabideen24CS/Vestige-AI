import { useState } from "react";
import { useSearch } from "../api/hooks/useIngestion";
import { useClients } from "../api/hooks/useClients";

const field = "px-3 py-2 border border-slate-300 rounded-lg text-sm";

export default function Search() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("");

  const { data: clients } = useClients({ limit: 100 });
  const { data, isFetching, isError } = useSearch(
    query,
    clientId ? Number(clientId) : undefined
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuery(input.trim());
  }

  function scoreColor(score: number) {
    if (score >= 0.7) return "bg-green-100 text-green-800";
    if (score >= 0.5) return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-600";
  }

  return (
    <main className="p-8 max-w-4xl">
      <h2 className="text-xl font-medium mb-1">Search</h2>
      <p className="text-sm text-slate-500 mb-5">
        Ask a question in plain language. Results are matched by meaning, not keywords.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Why did we choose SQL Server for that project?"
          className={`${field} flex-1`}
        />
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className={field}
        >
          <option value="">All clients</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={input.trim().length < 3}
          className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm disabled:opacity-40"
        >
          Search
        </button>
      </form>

      {isFetching && <p className="text-sm text-slate-500">Searching...</p>}
      {isError && <p className="text-sm text-red-600">Search failed. Is the backend running?</p>}

      {data && !isFetching && (
        <>
          <p className="text-sm text-slate-500 mb-3">
            {data.hits.length} result{data.hits.length === 1 ? "" : "s"} for "{data.query}"
          </p>

          {data.hits.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-sm text-slate-500">
                Nothing matched. Try different wording, or ingest more documents.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {data.hits.map((hit, i) => (
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
    </main>
  );
}