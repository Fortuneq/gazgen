import { getInitData } from "./telegram";

const BASE = "/api";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getAuthHeader(): string | null {
  // Priority 1: Telegram MiniApp initData
  const initData = getInitData();
  if (initData) return `tma ${initData}`;

  // Priority 2: JWT from Telegram Login Widget (browser)
  const token = localStorage.getItem("auth_token");
  if (token) return `Bearer ${token}`;

  return null;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const auth = getAuthHeader();
  if (auth) {
    headers["Authorization"] = auth;
  }
  const res = await fetch(`${BASE}${url}`, {
    headers,
    ...options,
  });
  if (!res.ok) throw new ApiError(res.status, `API Error: ${res.status}`);
  return res.json();
}

export { ApiError };

export const api = {
  // Posts
  getPosts: (params?: { category?: string; tag?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.category) sp.set("category", params.category);
    if (params?.tag) sp.set("tag", params.tag);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.limit) sp.set("limit", String(params.limit));
    const q = sp.toString();
    return request<import("./types").PaginatedPosts>(`/posts${q ? "?" + q : ""}`);
  },
  getPost: (id: number) =>
    request<import("./types").PostDetail>(`/posts/${id}`),

  // Categories
  getCategories: () =>
    request<import("./types").Category[]>("/categories"),
  getCategoryCoverUrl: (categoryName: string) =>
    `${BASE}/categories/${encodeURIComponent(categoryName)}/cover`,

  // Tags
  getTags: () =>
    request<import("./types").Tag[]>("/tags"),
  getTagCoverUrl: (tagName: string) =>
    `${BASE}/tags/${encodeURIComponent(tagName)}/cover`,

  // Images
  getResultImageUrl: (postId: number) => `${BASE}/images/${postId}/result`,
  getResultThumbUrl: (postId: number) => `${BASE}/images/${postId}/result/thumb`,
  getReferenceImageUrl: (postId: number, order: number) =>
    `${BASE}/images/${postId}/reference/${order}`,

  // Search
  search: (query: string, limit = 10) =>
    request<import("./types").SearchResult[]>("/search", {
      method: "POST",
      body: JSON.stringify({ query, limit }),
    }),

  // Generate
  startGeneration: (data: import("./types").GenerateRequest) =>
    request<import("./types").GenerateResponse>("/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  startDirectGeneration: (data: import("./types").DirectGenerateRequest) =>
    request<import("./types").GenerateResponse>("/generate/direct", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  uploadReference: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    const auth = getAuthHeader();
    if (auth) {
      headers["Authorization"] = auth;
    }
    const res = await fetch(`${BASE}/upload-reference`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },
  getGenerationStatus: (taskId: string) =>
    request<import("./types").GenerateStatus>(`/generate/${taskId}/status`),

  // Payments (CryptoCloud)
  createPayment: (data: import("./types").CreatePaymentRequest) =>
    request<import("./types").CreatePaymentResponse>("/payments/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getPaymentStatus: (orderId: string) =>
    request<import("./types").PaymentStatus>(`/payments/status/${encodeURIComponent(orderId)}`),

  // Payments (Pally — card/SBP)
  createPallyPayment: (data: import("./types").CreatePaymentRequest) =>
    request<import("./types").CreatePaymentResponse>("/payments/pally/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getPallyPaymentStatus: (orderId: string) =>
    request<import("./types").PaymentStatus>(`/payments/pally/status/${encodeURIComponent(orderId)}`),

  // Profile
  getProfile: () => request<import("./types").UserProfile>("/profile"),

  // Auth (Telegram Login Widget)
  authTelegram: (data: Record<string, string | number>) =>
    request<{ token: string; user: { id: number; first_name: string; username?: string } }>("/auth/telegram", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Health
  health: () => request<{ status: string }>("/health"),
};
