import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { PostDetail, GenerateRequest, ModelTier } from '../types'
import { getPost, getImageUrl, startGeneration, getGenerationStatus } from '../api'
import { MODEL_DATA } from '../api'
import { tg, haptic, hapticSuccess, hapticError } from '../telegram'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { Sparkles, Download, RotateCcw } from 'lucide-react'

type PromptMode = 'original' | 'custom' | 'adapted'
type PageState = 'form' | 'generating' | 'result'

const ACCENT = '#C4F82A'
const SURFACE = '#18181B'
const BORDER = '#27272A'
const BG = '#0A0A0A'
const TEXT = '#FFFFFF'
const TEXT_SEC = '#A1A1AA'
const TEXT_TER = '#52525B'

const ASPECT_RATIOS: { label: string; value: string; w: number; h: number }[] = [
  { label: '1:1', value: '1:1', w: 1, h: 1 },
  { label: '16:9', value: '16:9', w: 16, h: 9 },
  { label: '9:16', value: '9:16', w: 9, h: 16 },
]

export default function GeneratePage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  const [post, setPost] = useState<PostDetail | null>(null)
  const [loadingPost, setLoadingPost] = useState(false)

  const [pageState, setPageState] = useState<PageState>('form')
  const [promptMode, setPromptMode] = useState<PromptMode>('original')
  const [customPrompt, setCustomPrompt] = useState('')
  const [useReferences, setUseReferences] = useState(true)
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [selectedModel, setSelectedModel] = useState<ModelTier>('standard')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [textareaFocused, setTextareaFocused] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hasValidPostId = !!postId && postId !== '0'

  useEffect(() => {
    if (!hasValidPostId) return
    setLoadingPost(true)
    getPost(Number(postId))
      .then((p) => {
        setPost(p)
        setCustomPrompt(p.prompt || '')
      })
      .catch(console.error)
      .finally(() => setLoadingPost(false))
  }, [postId, hasValidPostId])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const goBack = useCallback(() => {
    if (pageState === 'result') {
      navigate('/')
    } else {
      navigate(-1)
    }
  }, [pageState, navigate])

  useEffect(() => {
    if (!tg) return
    if (pageState === 'generating') {
      tg.BackButton.hide()
    } else {
      tg.BackButton.show()
      tg.BackButton.onClick(goBack)
    }
    return () => {
      if (tg) tg.BackButton.offClick(goBack)
    }
  }, [goBack, pageState])

  const handleGenerate = async () => {
    haptic('heavy')
    setPageState('generating')
    setError(null)

    const req: GenerateRequest = {
      post_id: post ? post.id : 0,
      prompt_mode: promptMode,
      aspect_ratio: aspectRatio,
      use_references: useReferences,
      model: selectedModel,
    }
    if (promptMode === 'custom' || promptMode === 'adapted') {
      req.custom_prompt = customPrompt
    }

    try {
      const { task_id } = await startGeneration(req)
      setTaskId(task_id)

      pollRef.current = setInterval(async () => {
        try {
          const status = await getGenerationStatus(task_id)
          if (status.status === 'success' && status.result_url) {
            if (pollRef.current) clearInterval(pollRef.current)
            setResultUrl(status.result_url)
            setPageState('result')
            hapticSuccess()
          } else if (status.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current)
            setError(status.error || 'Ошибка генерации')
            setPageState('form')
            hapticError()
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current)
          setError('Потеряно соединение')
          setPageState('form')
          hapticError()
        }
      }, 3000)
    } catch {
      setError('Не удалось запустить генерацию')
      setPageState('form')
      hapticError()
    }
  }

  const handleReset = () => {
    haptic('medium')
    setPageState('form')
    setResultUrl(null)
    setTaskId(null)
    setError(null)
  }

  const isGenerateDisabled =
    (promptMode === 'custom' || promptMode === 'adapted') && !customPrompt.trim()

  if (pageState === 'generating') {
    return <GeneratingOverlay taskId={taskId} />
  }

  if (pageState === 'result' && resultUrl) {
    return (
      <ResultView
        resultUrl={resultUrl}
        promptMode={promptMode}
        customPrompt={customPrompt}
        onReset={handleReset}
      />
    )
  }

  if (isDesktop) {
    return (
      <div style={s.desktopRoot}>
        <div style={s.desktopLeft}>
          <FormContent
            post={post}
            loadingPost={loadingPost}
            promptMode={promptMode}
            setPromptMode={setPromptMode}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt}
            useReferences={useReferences}
            setUseReferences={setUseReferences}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            textareaFocused={textareaFocused}
            setTextareaFocused={setTextareaFocused}
            error={error}
            isGenerateDisabled={isGenerateDisabled}
            onGenerate={handleGenerate}
          />
        </div>
        <div style={s.desktopRight}>
          <DesktopPreview post={post} loadingPost={loadingPost} />
        </div>
      </div>
    )
  }

  return (
    <div style={s.mobileRoot} className="safe-bottom">
      <FormContent
        post={post}
        loadingPost={loadingPost}
        promptMode={promptMode}
        setPromptMode={setPromptMode}
        customPrompt={customPrompt}
        setCustomPrompt={setCustomPrompt}
        useReferences={useReferences}
        setUseReferences={setUseReferences}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        textareaFocused={textareaFocused}
        setTextareaFocused={setTextareaFocused}
        error={error}
        isGenerateDisabled={isGenerateDisabled}
        onGenerate={handleGenerate}
      />
    </div>
  )
}

// ---- Sub-components ----

interface FormContentProps {
  post: PostDetail | null
  loadingPost: boolean
  promptMode: PromptMode
  setPromptMode: (m: PromptMode) => void
  customPrompt: string
  setCustomPrompt: (v: string) => void
  useReferences: boolean
  setUseReferences: (v: boolean) => void
  aspectRatio: string
  setAspectRatio: (v: string) => void
  selectedModel: ModelTier
  setSelectedModel: (m: ModelTier) => void
  textareaFocused: boolean
  setTextareaFocused: (v: boolean) => void
  error: string | null
  isGenerateDisabled: boolean
  onGenerate: () => void
}

function FormContent({
  post,
  loadingPost,
  promptMode,
  setPromptMode,
  customPrompt,
  setCustomPrompt,
  useReferences,
  setUseReferences,
  aspectRatio,
  setAspectRatio,
  selectedModel,
  setSelectedModel,
  textareaFocused,
  setTextareaFocused,
  error,
  isGenerateDisabled,
  onGenerate,
}: FormContentProps) {
  return (
    <div style={s.formScroll}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>Создать</h1>
      </div>

      {/* Error */}
      {error && (
        <div style={s.errorBanner}>{error}</div>
      )}

      {/* Post preview */}
      {loadingPost && (
        <div style={s.section}>
          <div style={{ ...s.postCard, justifyContent: 'center', minHeight: 64 }}>
            <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton" style={{ width: 60, height: 12, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 4 }} />
            </div>
          </div>
        </div>
      )}

      {!loadingPost && post && (
        <div style={s.section}>
          <div style={s.postCard}>
            <img
              src={getImageUrl(post.id)}
              alt=""
              style={s.postThumb}
            />
            <div>
              <p style={s.postCardLabel}>На основе поста</p>
              <p style={s.postCardCategory}>{post.category_emoji} {post.category}</p>
            </div>
          </div>
        </div>
      )}

      {/* Prompt mode tabs */}
      <div style={s.section}>
        <p style={s.sectionLabel}>Режим промпта</p>
        <div style={s.tabRow}>
          {(['original', 'custom', 'adapted'] as PromptMode[]).map((mode) => {
            const labels: Record<PromptMode, string> = {
              original: 'Оригинал',
              custom: 'Свой',
              adapted: 'Адаптация',
            }
            const isActive = promptMode === mode
            return (
              <button
                key={mode}
                style={{
                  ...s.tab,
                  ...(isActive ? s.tabActive : s.tabInactive),
                }}
                onClick={() => { haptic('light'); setPromptMode(mode) }}
              >
                {labels[mode]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Textarea */}
      {(promptMode === 'custom' || promptMode === 'adapted') && (
        <div style={s.section}>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={promptMode === 'custom' ? 'Введите свой промпт...' : 'Опишите вашу идею...'}
            rows={4}
            style={{
              ...s.textarea,
              ...(textareaFocused ? s.textareaFocused : {}),
            }}
            onFocus={() => setTextareaFocused(true)}
            onBlur={() => setTextareaFocused(false)}
          />
        </div>
      )}

      {/* References toggle */}
      {post && post.reference_count > 0 && (
        <div style={s.section}>
          <p style={s.sectionLabel}>Референсы</p>
          <div style={s.refToggleRow}>
            <button
              style={{
                ...s.refToggleBtn,
                ...(useReferences ? s.refToggleBtnActive : {}),
              }}
              onClick={() => { haptic('light'); setUseReferences(true) }}
            >
              Использовать
            </button>
            <button
              style={{
                ...s.refToggleBtn,
                ...(!useReferences ? s.refToggleBtnActive : {}),
              }}
              onClick={() => { haptic('light'); setUseReferences(false) }}
            >
              Без референсов
            </button>
          </div>
        </div>
      )}

      {/* Aspect ratio */}
      <div style={s.section}>
        <p style={s.sectionLabel}>Соотношение сторон</p>
        <div style={s.ratioRow}>
          {ASPECT_RATIOS.map((r) => {
            const isActive = aspectRatio === r.value
            return (
              <button
                key={r.value}
                style={{
                  ...s.ratioBtn,
                  ...(isActive ? s.ratioBtnActive : {}),
                }}
                onClick={() => { haptic('light'); setAspectRatio(r.value) }}
              >
                <RatioIcon w={r.w} h={r.h} active={isActive} />
                <span style={{ ...s.ratioLabel, ...(isActive ? { color: ACCENT } : {}) }}>
                  {r.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Model selector */}
      <div style={s.section}>
        <p style={s.sectionLabel}>Модель</p>
        <div style={s.modelGrid}>
          {MODEL_DATA.map((m) => {
            const isActive = selectedModel === m.id
            return (
              <button
                key={m.id}
                style={{
                  ...s.modelCard,
                  ...(isActive ? s.modelCardActive : {}),
                }}
                onClick={() => { haptic('light'); setSelectedModel(m.id) }}
              >
                <p style={{ ...s.modelName, ...(isActive ? { color: ACCENT } : {}) }}>
                  {m.name}
                </p>
                <p style={s.modelDesc}>{m.description}</p>
                <p style={{ ...s.modelCost, ...(isActive ? { color: ACCENT } : {}) }}>
                  {m.creditsPerPhoto} кр/фото
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Generate CTA */}
      <div style={s.ctaSection}>
        <button
          style={{
            ...s.generateBtn,
            ...(isGenerateDisabled ? s.generateBtnDisabled : {}),
          }}
          onClick={onGenerate}
          disabled={isGenerateDisabled}
        >
          <Sparkles size={18} color={isGenerateDisabled ? TEXT_TER : '#0A0A0A'} />
          Создать
        </button>
      </div>
    </div>
  )
}

function RatioIcon({ w, h, active }: { w: number; h: number; active: boolean }) {
  const maxW = 32
  const maxH = 24
  const scale = Math.min(maxW / w, maxH / h)
  const rw = Math.round(w * scale)
  const rh = Math.round(h * scale)
  return (
    <div style={{
      width: maxW,
      height: maxH,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: rw,
        height: rh,
        borderRadius: 3,
        border: `2px solid ${active ? ACCENT : BORDER}`,
        background: active ? `${ACCENT}18` : 'transparent',
        transition: 'border-color 0.2s ease, background 0.2s ease',
      }} />
    </div>
  )
}

function DesktopPreview({ post, loadingPost }: { post: PostDetail | null; loadingPost: boolean }) {
  return (
    <div style={s.desktopPreviewWrap}>
      {loadingPost ? (
        <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 20, minHeight: 400 }} />
      ) : post ? (
        <img
          src={getImageUrl(post.id)}
          alt=""
          style={s.desktopPreviewImg}
        />
      ) : (
        <div style={s.desktopPreviewEmpty}>
          <div style={s.desktopPreviewEmptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={TEXT_TER} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <p style={s.desktopPreviewHint}>Предпросмотр появится здесь</p>
        </div>
      )}
    </div>
  )
}

function GeneratingOverlay({ taskId }: { taskId: string | null }) {
  return (
    <div style={s.genOverlay}>
      <div style={s.genContent}>
        {/* Lime spinner */}
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="rgba(196,248,42,0.12)"
            strokeWidth="5"
          />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke={ACCENT}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="80 134"
            style={{ animation: 'spin 1.2s linear infinite', transformOrigin: '40px 40px' }}
          />
        </svg>

        <p style={s.genTitle}>Генерация...</p>
        <p style={s.genSubtitle}>Обычно занимает 15-30 секунд</p>

        {/* Progress bar */}
        <div style={s.progressTrack}>
          <div style={s.progressFill} />
        </div>

        {taskId && (
          <p style={s.genTaskId}>{taskId.slice(0, 8)}...</p>
        )}
      </div>
    </div>
  )
}

function ResultView({
  resultUrl,
  promptMode,
  customPrompt,
  onReset,
}: {
  resultUrl: string
  promptMode: PromptMode
  customPrompt: string
  onReset: () => void
}) {
  return (
    <div style={s.resultRoot} className="safe-bottom">
      <div style={s.resultScroll}>
        <div style={s.resultImgWrap}>
          <img src={resultUrl} alt="Generated result" style={s.resultImg} />
        </div>

        {(promptMode === 'custom' || promptMode === 'adapted') && customPrompt && (
          <div style={s.resultInfoCard}>
            <p style={s.resultInfoLabel}>Промпт</p>
            <p style={s.resultInfoText}>{customPrompt}</p>
          </div>
        )}

        <div style={s.resultActions}>
          <a
            href={resultUrl}
            download
            style={s.downloadBtn}
            onClick={() => hapticSuccess()}
          >
            <Download size={18} color="#0A0A0A" />
            Скачать
          </a>
          <button style={s.againBtn} onClick={onReset}>
            <RotateCcw size={18} color={TEXT} />
            Создать ещё
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Styles ----

const s: Record<string, React.CSSProperties> = {
  // Mobile root
  mobileRoot: {
    minHeight: '100vh',
    background: BG,
    overflowY: 'auto',
  },

  // Desktop root
  desktopRoot: {
    display: 'flex',
    minHeight: '100vh',
    background: BG,
  },
  desktopLeft: {
    width: 480,
    flexShrink: 0,
    borderRight: `1px solid ${BORDER}`,
    overflowY: 'auto',
  },
  desktopRight: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    background: BG,
  },

  // Form scroll
  formScroll: {
    display: 'flex',
    flexDirection: 'column',
  },

  // Header
  header: {
    padding: '24px 20px 8px',
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: 24,
    fontWeight: 700,
    color: TEXT,
    margin: 0,
  },

  // Error
  errorBanner: {
    margin: '0 20px 4px',
    padding: '12px 16px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 16,
    color: '#EF4444',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
  },

  // Sections
  section: {
    padding: '12px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: TEXT_TER,
    margin: 0,
  },

  // Post preview card
  postCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
  },
  postThumb: {
    width: 48,
    height: 48,
    objectFit: 'cover' as const,
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    flexShrink: 0,
  },
  postCardLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    color: TEXT_TER,
    margin: 0,
  },
  postCardCategory: {
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    fontWeight: 600,
    color: TEXT,
    margin: '2px 0 0',
  },

  // Prompt mode tabs
  tabRow: {
    display: 'flex',
    gap: 6,
  },
  tab: {
    flex: 1,
    padding: '10px 6px',
    borderRadius: 100,
    border: `1px solid ${BORDER}`,
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
  },
  tabActive: {
    background: ACCENT,
    borderColor: ACCENT,
    color: '#0A0A0A',
    fontWeight: 600,
  },
  tabInactive: {
    background: SURFACE,
    color: TEXT_SEC,
  },

  // Textarea
  textarea: {
    width: '100%',
    padding: '14px',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    color: TEXT,
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    lineHeight: '1.5',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: 100,
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box' as const,
  },
  textareaFocused: {
    borderColor: ACCENT,
  },

  // References toggle
  refToggleRow: {
    display: 'flex',
    gap: 8,
  },
  refToggleBtn: {
    flex: 1,
    padding: '10px 12px',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 100,
    color: TEXT_SEC,
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, color 0.15s ease',
  },
  refToggleBtnActive: {
    borderColor: ACCENT,
    color: ACCENT,
  },

  // Aspect ratio
  ratioRow: {
    display: 'flex',
    gap: 8,
  },
  ratioBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
    padding: '14px 8px',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, background 0.15s ease',
  },
  ratioBtnActive: {
    borderColor: ACCENT,
    background: `${ACCENT}10`,
  },
  ratioLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    fontWeight: 500,
    color: TEXT_SEC,
    transition: 'color 0.15s ease',
  },

  // Model grid
  modelGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  modelCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: 4,
    padding: '14px 14px',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'border-color 0.15s ease, background 0.15s ease',
  },
  modelCardActive: {
    borderColor: ACCENT,
    background: `${ACCENT}0D`,
  },
  modelName: {
    fontFamily: 'var(--font-heading)',
    fontSize: 14,
    fontWeight: 700,
    color: TEXT,
    margin: 0,
    transition: 'color 0.15s ease',
  },
  modelDesc: {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    color: TEXT_TER,
    margin: 0,
    lineHeight: 1.4,
  },
  modelCost: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 600,
    color: TEXT_SEC,
    margin: '2px 0 0',
    transition: 'color 0.15s ease',
  },

  // CTA
  ctaSection: {
    padding: '12px 20px 32px',
  },
  generateBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '16px 24px',
    background: ACCENT,
    border: 'none',
    borderRadius: 100,
    color: '#0A0A0A',
    fontFamily: 'var(--font-heading)',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
  },
  generateBtnDisabled: {
    background: SURFACE,
    color: TEXT_TER,
    cursor: 'not-allowed',
  },

  // Desktop preview
  desktopPreviewWrap: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 20,
    overflow: 'hidden',
    border: `1px solid ${BORDER}`,
    minHeight: 400,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: SURFACE,
  },
  desktopPreviewImg: {
    width: '100%',
    display: 'block',
  },
  desktopPreviewEmpty: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
    padding: 40,
  },
  desktopPreviewEmptyIcon: {
    opacity: 0.4,
  },
  desktopPreviewHint: {
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    color: TEXT_TER,
    margin: 0,
  },

  // Generating overlay
  genOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(10,10,10,0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  genContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 16,
    padding: '0 32px',
    textAlign: 'center' as const,
  },
  genTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 20,
    fontWeight: 700,
    color: TEXT,
    margin: 0,
  },
  genSubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    color: TEXT_SEC,
    margin: 0,
  },
  progressTrack: {
    width: 200,
    height: 4,
    background: SURFACE,
    borderRadius: 100,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    background: ACCENT,
    borderRadius: 100,
    animation: 'progressPulse 2s ease-in-out infinite',
    width: '60%',
  },
  genTaskId: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: TEXT_TER,
    margin: 0,
    opacity: 0.5,
  },

  // Result
  resultRoot: {
    minHeight: '100vh',
    background: BG,
  },
  resultScroll: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
    padding: '24px 20px 32px',
  },
  resultImgWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    border: `1px solid ${BORDER}`,
  },
  resultImg: {
    width: '100%',
    display: 'block',
  },
  resultInfoCard: {
    padding: '14px 16px',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  resultInfoLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: TEXT_TER,
    margin: 0,
  },
  resultInfoText: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: TEXT_SEC,
    margin: 0,
    lineHeight: 1.5,
  },
  resultActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  downloadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '16px 24px',
    background: ACCENT,
    border: 'none',
    borderRadius: 100,
    color: '#0A0A0A',
    fontFamily: 'var(--font-heading)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    boxSizing: 'border-box' as const,
    transition: 'opacity 0.15s ease',
  },
  againBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px 24px',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 100,
    color: TEXT,
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
}
