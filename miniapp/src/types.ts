export interface Category {
  name: string;
  emoji: string;
  post_count: number;
}

export interface Tag {
  name: string;
  display_name: string;
  emoji: string;
  post_count: number;
}

export interface Post {
  id: number;
  publication_id: string;
  prompt: string | null;
  category: string;
  category_emoji: string;
  created_at: string;
  has_result_image: boolean;
  reference_count: number;
}

export interface PostDetail extends Post {
  references: ImageMeta[];
}

export interface ImageMeta {
  order: number;
  width: number | null;
  height: number | null;
}

export interface PaginatedPosts {
  items: Post[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface SearchResult extends Post {
  similarity: number;
}

export interface GenerateRequest {
  post_id: number;
  prompt_mode: "original" | "custom" | "adapted";
  custom_prompt?: string;
  aspect_ratio: string;
  use_references: boolean;
  model?: string;
}

export interface DirectGenerateRequest {
  prompt: string;
  model: string;
  aspect_ratio: string;
  reference_urls: string[];
}

export interface GenerateResponse {
  task_id: string;
}

export interface GenerateStatus {
  task_id: string;
  status: "pending" | "processing" | "success" | "completed" | "failed";
  result_url?: string;
  error?: string;
}

export interface UserProfile {
  telegram_id: number;
  first_name: string | null;
  username: string | null;
  photo_credits: number;
  video_credits: number;
}

export type Gender = "male" | "female" | "unisex";
export type PromptMode = "original" | "custom";
export type AspectRatio = "1:1" | "16:9" | "9:16";
export type AnimeDuration = "3" | "5" | "10" | "15";
export type AnimateModel = "kling2.6" | "kling3.0" | "veo";
export type ViewFilter = "all" | "photo" | "video";
export type FeedFilter = "all" | "popular" | "new";
