import { useState, useEffect } from "react";
import { useSearch, useAsk } from "../api/hooks/useIngestion";
import { useClients } from "../api/hooks/useClients";
import { api } from "../api/clients";
import type { SearchHit } from "../types";

const field = "px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-slate-900";

export default function Search() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<{id: number, name: string}[]>([]);
  const [mode, setMode] = useState<"ask" | "search">("ask");

  const { data: clients } = useClients({ limit: 100 });

  // Use the updated hook (now accepts 3 arguments)
  const search = useSearch(
    mode === "search" ? query : "", 
    clientId ? Number(clientId) : undefined,
    projectId ? Number(projectId) : undefined
  );
  
  const ask = useAsk();

  // Load projects when client changes
  useEffect(() => {
    if (clientId) {
      api.get(`/projects/dropdown?client_id=${clientId}`)
        .then(res => setProjects(res.data))
        .catch(() => setProjects([]));
      setProjectId(""); 
    } else {
      setProjects([]);
      setProjectId("");
    }
  }, [clientId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (q.length < 3) return;

    if (mode === "ask") {
      ask.mutate({ 
        question: q, 
        clientId: clientId ? Number(clientId) : undefined,
        projectId: projectId ? Number(projectId) : undefined 
      });
    } else {
      setQuery(q); // Trigger semantic search
    }
  }

  function scoreColor(score: number) {
    if (score >= 0.7) return "bg-green-100 text-green-800";
    if (score >= 0.55) return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-600";
  }

  // Choose data based on active mode
  const hits = mode === "ask" ? ask.data?.sources : search.data?.hits;
  const busy = mode === "ask" ? ask.isPending : search.isFetching;

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold mb-1">Project Search</h2>
      <p className="text-sm text-slate-500 mb-6">Ask questions or find specific passages from meetings.</p>

      <div className="flex gap-2 mb-4">
        {(["ask", "search"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              mode === m ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {m === "ask" ? "AI Answer" : "Passages"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === "ask" ? "Ask a question..." : "Search for keywords..."}
          className={`${field} md:col-span-2`}
        />
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={field}>
          <option value="">Select Client</option>
          {clients?.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={field} disabled={!clientId}>
          <option value="">{clientId ? "Select Project" : "Choose Client First"}</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="submit" disabled={busy} className="md:col-span-4 bg-slate-900 text-white py-2.5 rounded-lg font-bold">
          {busy ? "Processing..." : mode === "ask" ? "Get AI Answer" : "Search Passages"}
        </button>
      </form>

      {mode === "ask" && ask.data && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Answer</p>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{ask.data.answer}</div>
        </div>
      )}

      {hits && hits.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-500 mb-2">
            {mode === "ask" ? "Sources Used" : "Matching Passages"}
          </p>
          {hits.map((hit: SearchHit, i: number) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{hit.filename}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${scoreColor(hit.score)}`}>
                  {(hit.score * 100).toFixed(0)}% match
                </span>
              </div>
              <p className="text-sm text-slate-700 italic">"{hit.text}"</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}