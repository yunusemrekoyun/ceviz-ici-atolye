/* eslint-disable no-empty */
// frontend/src/lib/api.js

const BASE = import.meta.env.VITE_API_BASE_URL;

// 401 yayınlamak için basit event bus
export const apiEvents = new EventTarget();

// ---- Core fetch wrapper ----
// options: { method, headers, body, raw=false, credentials }
export async function api(path, options = {}) {
  const { raw = false, ...rest } = options;

  const isFormData =
    typeof FormData !== "undefined" && rest.body instanceof FormData;

  const headers = {
    ...(rest.headers || {}),
  };
  // FormData değilse content-type ekle
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: "include", // HttpOnly cookie şart
    ...rest,
    headers,
  });

  if (raw) return res;

  let payload = null;
  const text = await res.text().catch(() => "");
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    if (res.status === 401) {
      apiEvents.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    const msg =
      (payload && (payload.error || payload.message)) ||
      text ||
      res.statusText ||
      "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

// ---- Domain APIs ----

export const AuthAPI = {
  async register({ name, email, password }) {
    // sunucu cookie set eder; front token tutmaz
    return api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },
  async login({ email, password }) {
    return api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  async me() {
    return api("/auth/me");
  },
  async logout() {
    return api("/auth/logout", { method: "POST" });
  },
};

function toFormData(obj) {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      fd.append(k, v.join(", "));
    } else {
      fd.append(k, v);
    }
  });
  return fd;
}

export const ArticleAPI = {
  list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/articles${qs ? `?${qs}` : ""}`);
  },
  detail(slug) {
    return api(`/articles/${slug}`);
  },

  // multipart: data (title, slug, summary, content, imageAlt, tags, status...), file (opsiyonel)
  create(data, file) {
    const fd = toFormData(data);
    if (file) fd.append("image", file);
    return api(`/articles`, {
      method: "POST",
      body: fd, // Content-Type set etme; browser belirler
    });
  },
  update(slug, data, file) {
    const fd = toFormData(data);
    if (file) fd.append("image", file);
    return api(`/articles/${slug}`, {
      method: "PUT",
      body: fd,
    });
  },
  remove(slug) {
    return api(`/articles/${slug}`, { method: "DELETE" });
  },
};

export const DecisionAPI = {
  list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/decisions${qs ? `?${qs}` : ""}`);
  },
  detail(slug) {
    return api(`/decisions/${slug}`);
  },
  create(data, file) {
    const fd = toFormData(data);
    if (file) fd.append("image", file);
    return api(`/decisions`, { method: "POST", body: fd });
  },
  update(slug, data, file) {
    const fd = toFormData(data);
    if (file) fd.append("image", file);
    return api(`/decisions/${slug}`, { method: "PUT", body: fd });
  },
  remove(slug) {
    return api(`/decisions/${slug}`, { method: "DELETE" });
  },
};

export const ContactAPI = {
  async send({ name, email, phone, subject, message }) {
    return api("/contact", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, subject, message }),
    });
  },
};
