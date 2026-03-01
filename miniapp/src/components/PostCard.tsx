import { useState } from "react";
import type { Post } from "../types";
import { api } from "../api";

interface PostCardProps {
  post: Post;
  onClick?: () => void;
  aspectRatio?: string;
  eager?: boolean;
}

export function PostCard({ post, onClick, aspectRatio, eager = false }: PostCardProps) {
  const hasImage = post.has_result_image;
  const [loaded, setLoaded] = useState(false);

  const deterministicRatio =
    post.id % 3 === 0 ? "4/5" : post.id % 3 === 1 ? "3/4" : "1/1";

  return (
    <button onClick={onClick}
      style={{
        width: "100%", borderRadius: 12, overflow: "hidden", position: "relative",
        background: "#18181B", border: "none", padding: 0, cursor: "pointer",
        aspectRatio: aspectRatio || deterministicRatio,
        display: "block",
      }}>
      {hasImage && !loaded && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, #18181B 25%, #27272A 50%, #18181B 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
        }} />
      )}
      {hasImage && (
        <img
          src={api.getResultImageUrl(post.id)}
          alt={post.prompt || "Generated image"}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{
            width: "100%", height: "100%", objectFit: "cover", display: "block",
            opacity: loaded ? 1 : 0, transition: "opacity 0.2s",
          }}
        />
      )}
      {!hasImage && (
        <div style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#71717A", fontSize: 13,
        }}>
          No image
        </div>
      )}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </button>
  );
}
