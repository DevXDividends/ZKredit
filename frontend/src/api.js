const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let authToken = null;
export function setAuthToken(token) {
  authToken = token;
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  signup: (payload) => request("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  googleAuth: (payload) => request("/auth/google", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),

  // Applications (all require auth)
  submitApplication: (payload) =>
    request("/applications", { method: "POST", body: JSON.stringify(payload) }),
  getApplication: (id) => request(`/applications/${id}`),
  listApplications: () => request("/applications"),
  generateProof: (id) => request(`/applications/${id}/generate-proof`, { method: "POST" }),
  runTamperDemo: (id) => request(`/applications/${id}/tamper-demo`, { method: "POST" }),

  // Loan-application OCR scanner
  extractApplicationPdf: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/ocr/extract-application", { method: "POST", body: formData });
  },
  generateTestPdf: () => request("/ocr/generate-test-pdf"),

  // Bank dashboard (unauthenticated for now — see README)
  bankSummary: () => request("/bank/summary"),
  bankApplications: () => request("/bank/applications"),
  fairnessReport: () => request("/fairness/report"),
};