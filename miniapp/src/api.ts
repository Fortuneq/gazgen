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
  getMyGenerations: (page = 1, limit = 20) =>
    request<import("./types").PaginatedGenerations>(`/profile/generations?page=${page}&limit=${limit}`),
  getGenerationByTask: (taskId: string) =>
    request<import("./types").UserGeneration>(`/profile/generations/${encodeURIComponent(taskId)}`),

  // Auth (Telegram Login Widget)
  authTelegram: (data: Record<string, string | number>) =>
    request<{ token: string; user: { id: number; first_name: string; username?: string } }>("/auth/telegram", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Health
  health: () => request<{ status: string }>("/health"),

  // Admin
  adminCheck: () => request<{ is_admin: boolean }>("/admin/check"),

  adminGetPosts: (params?: { page?: number; limit?: number; category?: string; search?: string }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set("page", String(params.page));
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.category) sp.set("category", params.category);
    if (params?.search) sp.set("search", params.search);
    const q = sp.toString();
    return request<import("./types").PaginatedAdminPosts>(`/admin/posts${q ? "?" + q : ""}`);
  },
  adminDeletePost: (id: number) =>
    request<{ ok: boolean }>(`/admin/posts/${id}`, { method: "DELETE" }),
  adminUpdatePost: (id: number, category: string) =>
    request<{ ok: boolean }>(`/admin/posts/${id}?category=${encodeURIComponent(category)}`, { method: "PATCH" }),

  adminGetCategories: () =>
    request<import("./types").AdminCategory[]>("/admin/categories"),
  adminCreateCategory: (name: string, emoji: string) =>
    request<import("./types").AdminCategory>(`/admin/categories?name=${encodeURIComponent(name)}&emoji=${encodeURIComponent(emoji)}`, { method: "POST" }),
  adminUpdateCategory: (id: number, params: { name?: string; emoji?: string }) => {
    const sp = new URLSearchParams();
    if (params.name !== undefined) sp.set("name", params.name);
    if (params.emoji !== undefined) sp.set("emoji", params.emoji);
    return request<{ ok: boolean }>(`/admin/categories/${id}?${sp.toString()}`, { method: "PATCH" });
  },
  adminDeleteCategory: (id: number) =>
    request<{ ok: boolean }>(`/admin/categories/${id}`, { method: "DELETE" }),

  adminGetUsers: (params?: { page?: number; limit?: number; search?: string }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set("page", String(params.page));
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.search) sp.set("search", params.search);
    const q = sp.toString();
    return request<import("./types").PaginatedAdminUsers>(`/admin/users${q ? "?" + q : ""}`);
  },
  adminAdjustCredits: (telegramId: number, amount: number, reason = "admin") =>
    request<{ ok: boolean; new_balance: number }>(`/admin/users/${telegramId}/credits`, {
      method: "POST",
      body: JSON.stringify({ amount, reason }),
    }),

  adminStatsOverview: () =>
    request<import("./types").StatsOverview>("/admin/stats/overview"),
  adminPopularModels: (days = 30) =>
    request<import("./types").PopularModel[]>(`/admin/stats/popular-models?days=${days}`),
  adminDailyActive: (days = 30) =>
    request<import("./types").DailyActive[]>(`/admin/stats/daily-active?days=${days}`),
  adminPaymentStats: (days = 30) =>
    request<import("./types").PaymentStats[]>(`/admin/stats/payments?days=${days}`),

  // Admin Tags
  adminGetTags: () =>
    request<import("./types").AdminTag[]>("/admin/tags"),
  adminCreateTag: (name: string, display_name: string, emoji: string) => {
    const sp = new URLSearchParams({ name, display_name, emoji });
    return request<import("./types").AdminTag>(`/admin/tags?${sp.toString()}`, { method: "POST" });
  },
  adminUpdateTag: (id: number, params: { name?: string; display_name?: string; emoji?: string; hidden?: boolean; sort_order?: number }) => {
    const sp = new URLSearchParams();
    if (params.name !== undefined) sp.set("name", params.name);
    if (params.display_name !== undefined) sp.set("display_name", params.display_name);
    if (params.emoji !== undefined) sp.set("emoji", params.emoji);
    if (params.hidden !== undefined) sp.set("hidden", String(params.hidden));
    if (params.sort_order !== undefined) sp.set("sort_order", String(params.sort_order));
    return request<{ ok: boolean }>(`/admin/tags/${id}?${sp.toString()}`, { method: "PATCH" });
  },
  adminDeleteTag: (id: number) =>
    request<{ ok: boolean }>(`/admin/tags/${id}`, { method: "DELETE" }),
};
