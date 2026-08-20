const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  submitApplication: (payload) =>
    request("/applications", { method: "POST", body: JSON.stringify(payload) }),
  getApplication: (id) => request(`/applications/${id}`),
  listApplications: () => request("/applications"),
  generateProof: (id) => request(`/applications/${id}/generate-proof`, { method: "POST" }),
  runTamperDemo: (id) => request(`/applications/${id}/tamper-demo`, { method: "POST" }),
  bankSummary: () => request("/bank/summary"),
  bankApplications: () => request("/bank/applications"),
  fairnessReport: () => request("/fairness/report"),
};

