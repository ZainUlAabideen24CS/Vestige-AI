import { useState, useRef } from "react";
import {
  useJobs,
  useDocuments,
  useUpload,
  useUploadAudio,
} from "../api/hooks/useIngestion";
import { useClients, useProjects } from "../api/hooks/useClients";

const statusStyles: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  processing: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const field = "px-3 py-2 border border-slate-300 rounded-lg text-sm";

export default function Ingest() {
  const [mode, setMode] = useState<"document" | "audio">("document");
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState("whatsapp");
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: jobs } = useJobs();
  const { data: documents } = useDocuments();
  const { data: clients } = useClients({ limit: 100 });
  const { data: projects } = useProjects({ limit: 100 });

  const upload = useUpload();
  const uploadAudio = useUploadAudio();

  const uploading = upload.isPending || uploadAudio.isPending;

  function resetForm() {
    setFile(null);
    setTitle("");
    setParticipants("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleUpload() {
    if (!file) return;

    if (mode === "document") {
      upload.mutate(
        {
          file,
          sourceType,
          clientId: clientId ? Number(clientId) : undefined,
          projectId: projectId ? Number(projectId) : undefined,
        },
        { onSuccess: resetForm }
      );
    } else {
      if (!title.trim()) return;

      uploadAudio.mutate(
        {
          file,
          title,
          participants: participants.trim() || undefined,
          clientId: clientId ? Number(clientId) : undefined,
          projectId: projectId ? Number(projectId) : undefined,
        },
        { onSuccess: resetForm }
      );
    }
  }

  return (
    <main className="p-8 max-w-5xl">
      <h2 className="text-xl font-medium mb-4">Ingest</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setMode("document");
            setFile(null);
          }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            mode === "document"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          Document
        </button>

        <button
          onClick={() => {
            setMode("audio");
            setFile(null);
          }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            mode === "audio"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          Meeting recording
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-3 gap-3 mb-3">
          {mode === "document" ? (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Source type</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className={`${field} w-full`}
              >
                <option value="whatsapp">whatsapp</option>
                <option value="email">email</option>
                <option value="transcript">transcript</option>
                <option value="file">file</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Meeting title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Nova standup"
                className={`${field} w-full`}
              />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-500 block mb-1">Client (optional)</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={`${field} w-full`}
            >
              <option value="">None</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={`${field} w-full`}
            >
              <option value="">Select project</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mode === "audio" && (
          <div className="mb-3">
            <label className="text-xs text-slate-500 block mb-1">
              Participants (optional)
            </label>
            <input
              type="text"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Uzair Shahid, Ali Raza, Faisal Ahmed"
              className={`${field} w-full`}
            />
            <p className="text-xs text-slate-400 mt-1">
              Comma-separated names of people speaking. Improves how accurately their
              names are spelled in the transcript.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept={
              mode === "document"
                ? ".txt,.md,.csv,.json"
                : ".mp3,.mp4,.wav,.m4a,.ogg,.flac"
            }
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm flex-1"
          />

          <button
            onClick={handleUpload}
            disabled={
              !file ||
              uploading ||
              !projectId ||
              (mode === "audio" && !title.trim())
            }
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm disabled:opacity-40"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {(upload.isError || uploadAudio.isError) && (
          <p className="text-sm text-red-600 mt-3">
            {mode === "document"
              ? "Upload failed. Allowed types: .txt, .md, .csv, .json"
              : "Upload failed. Allowed types: .mp3, .mp4, .wav, .m4a, .ogg, .flac"}
          </p>
        )}
      </div>

      <h3 className="text-lg font-medium mb-3">Jobs</h3>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        {!jobs && <p className="p-6 text-sm text-slate-500">Loading...</p>}

        {jobs && jobs.length === 0 && (
          <p className="p-6 text-sm text-slate-500">
            No jobs yet. Upload a file to start.
          </p>
        )}

        {jobs && jobs.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Job</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Uploaded by</th>
                <th className="text-left px-4 py-3 font-medium">Progress</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>

            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">#{j.id}</td>
                  <td className="px-4 py-3 text-slate-600">{j.job_type}</td>
                  <td className="px-4 py-3 font-medium">
                    {j.created_by_name ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-900 transition-all duration-500"
                          style={{ width: `${j.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{j.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        statusStyles[j.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                      title={j.error_message ?? undefined}
                    >
                      {j.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3 className="text-lg font-medium mb-3">Documents</h3>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {documents && documents.length === 0 && (
          <p className="p-6 text-sm text-slate-500">Nothing ingested yet.</p>
        )}

        {documents && documents.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium">File</th>
                <th className="text-left px-4 py-3 font-medium">Source</th>
                <th className="text-left px-4 py-3 font-medium">Uploaded by</th>
                <th className="text-left px-4 py-3 font-medium">Chunks</th>
                <th className="text-left px-4 py-3 font-medium">Uploaded</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{d.filename}</td>
                  <td className="px-4 py-3 text-slate-600">{d.source_type}</td>
                  <td className="px-4 py-3 font-medium">
                    {d.uploaded_by_name ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.chunk_count}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}