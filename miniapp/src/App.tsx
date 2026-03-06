import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AdminGate } from "./components/AdminGate";

const HomePage = lazy(() => import("./pages/HomePage"));
const CreateHubPage = lazy(() => import("./pages/CreateHubPage"));
const GeneratePage = lazy(() => import("./pages/GeneratePage"));
const CreateVideoPage = lazy(() => import("./pages/CreateVideoPage"));
const PostDetailPage = lazy(() => import("./pages/PostDetailPage"));
const LoadingPage = lazy(() => import("./pages/LoadingPage"));
const ResultPage = lazy(() => import("./pages/ResultPage"));
const AnimatePage = lazy(() => import("./pages/AnimatePage"));
const AnimatePromptPage = lazy(() => import("./pages/AnimatePromptPage"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PhotoDetailPage = lazy(() => import("./pages/PhotoDetailPage"));
const CategoryFeedPage = lazy(() => import("./pages/CategoryFeedPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const ReelsPage = lazy(() => import("./pages/ReelsPage"));
const ReelsTemplatePage = lazy(() => import("./pages/ReelsTemplatePage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminPhotosPage = lazy(() => import("./pages/admin/AdminPhotosPage"));
const AdminCategoriesPage = lazy(() => import("./pages/admin/AdminCategoriesPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminStatsPage = lazy(() => import("./pages/admin/AdminStatsPage"));

function LoadingFallback() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "var(--bg)",
    }}>
      <div className="animate-spin" style={{
        width: 40, height: 40, border: "3px solid #27272A",
        borderTopColor: "#C4F82A", borderRadius: "50%",
      }} />
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateHubPage />} />
        <Route path="/create/photo" element={<GeneratePage />} />
        <Route path="/create/photo/:postId" element={<GeneratePage />} />
        <Route path="/create/video" element={<CreateVideoPage />} />
        <Route path="/create/reels" element={<ReelsPage />} />
        <Route path="/create/animate" element={<AnimatePage />} />
        <Route path="/generate" element={<GeneratePage />} />
        <Route path="/generate/:postId" element={<GeneratePage />} />
        <Route path="/post/:postId" element={<PostDetailPage />} />
        <Route path="/loading/:taskId" element={<LoadingPage />} />
        <Route path="/result/:taskId" element={<ResultPage />} />
        <Route path="/animate" element={<AnimatePage />} />
        <Route path="/animate/prompt" element={<AnimatePromptPage />} />
        <Route path="/pricing" element={<SubscriptionPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/photo/:postId" element={<PhotoDetailPage />} />
        <Route path="/category/:name" element={<CategoryFeedPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/reels" element={<ReelsPage />} />
        <Route path="/reels/:templateId" element={<ReelsTemplatePage />} />
        <Route path="/admin" element={<AdminGate><AdminDashboardPage /></AdminGate>} />
        <Route path="/admin/photos" element={<AdminGate><AdminPhotosPage /></AdminGate>} />
        <Route path="/admin/categories" element={<AdminGate><AdminCategoriesPage /></AdminGate>} />
        <Route path="/admin/users" element={<AdminGate><AdminUsersPage /></AdminGate>} />
        <Route path="/admin/stats" element={<AdminGate><AdminStatsPage /></AdminGate>} />
      </Routes>
    </Suspense>
  );
}
