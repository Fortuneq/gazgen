import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { PostDetail, GenerateRequest } from '../types'
import { getPost, getImageUrl, getReferenceUrl, startGeneration, getGenerationStatus } from '../api'
import { tg, haptic, hapticSuccess, hapticError } from '../telegram'

type Step = 'prompt' | 'references' | 'ratio' | 'generating' | 'result'
type PromptMode = 'original' | 'custom' | 'adapted'

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1', icon: '[ ]' },
  { label: '16:9', value: '16:9', icon: '[ - ]' },
  { label: '9:16', value: '9:16', icon: '[|]' },
  { label: '4:3', value: '4:3', icon: '[-]' },
  { label: '3:4', value: '3:4', icon: '[:]' },
]

export default function GeneratePage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const [step, setStep] = useState<Step>('prompt')
  const [promptMode, setPromptMode] = useState<PromptMode>('original')
  const [customPrompt, setCustomPrompt] = useState('')
  const [useReferences, setUseReferences] = useState(true)
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!postId || postId === '0') {
      setLoading(false)
      return
    }
    setLoading(true)
    getPost(Number(postId))
      .then((p) => {
        setPost(p)
        setCustomPrompt(p.prompt || '')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [postId])

  const goBack = useCallback(() => {
    switch (step) {
      case 'prompt':
        navigate(-1)
        break
      case 'references':
        haptic('light')
        setStep('prompt')
        break
      case 'ratio':
        haptic('light')
        if (post && post.reference_count > 0) {
          setStep('references')
        } else {
          setStep('prompt')
        }
        break
      case 'generating':
        break
      case 'result':
        navigate('/')
        break
    }
  }, [step, navigate, post])

  useEffect(() => {
    if (tg) {
      if (step === 'generating') {
        tg.BackButton.hide()
      } else {
        tg.BackButton.show()
        tg.BackButton.onClick(goBack)
      }
    }
    return () => {
      if (tg) {
        tg.BackButton.offClick(goBack)
      }
    }
  }, [goBack, step])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const handleNextFromPrompt = () => {
    haptic('medium')
    if (post && post.reference_count > 0) {
      setStep('references')
    } else {
      setStep('ratio')
    }
  }

  const handleNextFromReferences = () => {
    haptic('medium')
    setStep('ratio')
  }

  const handleGenerate = async () => {
    if (!post) return
    haptic('heavy')
    setStep('generating')
    setError(null)

    const req: GenerateRequest = {
      post_id: post.id,
      prompt_mode: promptMode,
      aspect_ratio: aspectRatio,
      use_references: useReferences,
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
            setStep('result')
            hapticSuccess()
          } else if (status.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current)
            setError(status.error || 'Generation failed')
            setStep('prompt')
            hapticError()
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current)
          setError('Lost connection')
          setStep('prompt')
          hapticError()
        }
      }, 3000)
    } catch {
      setError('Failed to start generation')
      setStep('prompt')
      hapticError()
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div className="skeleton" style={{ width: 200, height: 200, borderRadius: 16 }} />
        </div>
      </div>
    )
  }

  if (!post && postId !== '0') {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <p style={styles.emptyText}>Post not found</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page} className="safe-bottom">
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span className="gradient-text">Generate</span>
        </h1>
        <StepIndicator current={step} />
      </div>

      {error && (
        <div className="animate-in" style={styles.errorBanner}>
          {error}
        </div>
      )}

      {step === 'prompt' && (
        <div className="animate-in" style={styles.stepContent}>
          {post && (
            <div style={styles.previewRow}>
              <img src={getImageUrl(post.id)} alt="" style={styles.previewThumb} />
              <div>
                <p style={styles.previewLabel}>Based on</p>
                <p style={styles.previewCategory}>{post.category_emoji} {post.category}</p>
              </div>
            </div>
          )}

          <p style={styles.sectionLabel}>Prompt Mode</p>
          <div style={styles.optionGroup}>
            <OptionButton
              active={promptMode === 'original'}
              onClick={() => { haptic(); setPromptMode('original') }}
              label="Use Original"
              description="Keep the exact prompt from this post"
            />
            <OptionButton
              active={promptMode === 'custom'}
              onClick={() => { haptic(); setPromptMode('custom') }}
              label="Modify Prompt"
              description="Edit the prompt yourself"
            />
            <OptionButton
              active={promptMode === 'adapted'}
              onClick={() => { haptic(); setPromptMode('adapted') }}
              label="Adapt with AI"
              description="Describe your idea, AI will adapt"
            />
          </div>

          {(promptMode === 'custom' || promptMode === 'adapted') && (
            <div className="animate-in" style={styles.textareaWrap}>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={promptMode === 'custom'
                  ? 'Edit the prompt...'
                  : 'Describe your idea...'}
                style={styles.textarea}
                rows={4}
              />
            </div>
          )}

          <button
            className="accent-btn"
            style={styles.nextBtn}
            onClick={handleNextFromPrompt}
            disabled={
              (promptMode === 'custom' || promptMode === 'adapted') && !customPrompt.trim()
            }
          >
            Continue
          </button>
        </div>
      )}

      {step === 'references' && post && (
        <div className="animate-in" style={styles.stepContent}>
          <p style={styles.sectionLabel}>Reference Images</p>
          <div style={styles.refPreview} className="hide-scrollbar">
            {post.references.map((ref) => (
              <img
                key={ref.order}
                src={getReferenceUrl(post.id, ref.order)}
                alt={`Reference ${ref.order}`}
                style={styles.refImg}
              />
            ))}
          </div>

          <div style={styles.optionGroup}>
            <OptionButton
              active={useReferences}
              onClick={() => { haptic(); setUseReferences(true) }}
              label="Use Original References"
              description="Include reference images in generation"
            />
            <OptionButton
              active={!useReferences}
              onClick={() => { haptic(); setUseReferences(false) }}
              label="No References"
              description="Generate using only the prompt"
            />
          </div>

          <button
            className="accent-btn"
            style={styles.nextBtn}
            onClick={handleNextFromReferences}
          >
            Continue
          </button>
        </div>
      )}

      {step === 'ratio' && (
        <div className="animate-in" style={styles.stepContent}>
          <p style={styles.sectionLabel}>Aspect Ratio</p>
          <div style={styles.ratioGrid}>
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r.value}
                style={{
                  ...styles.ratioBtn,
                  ...(aspectRatio === r.value ? styles.ratioBtnActive : {}),
                }}
                onClick={() => { haptic(); setAspectRatio(r.value) }}
              >
                <span style={styles.ratioIcon}>{r.icon}</span>
                <span style={styles.ratioLabel}>{r.label}</span>
              </button>
            ))}
          </div>

          <button
            className="accent-btn"
            style={styles.nextBtn}
            onClick={handleGenerate}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
            </svg>
            Generate
          </button>
        </div>
      )}

      {step === 'generating' && (
        <div className="animate-in" style={styles.generatingWrap}>
          <div style={styles.spinner}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <defs>
                <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="4"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="url(#spinGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="80 134"
                style={{ animation: 'spin 1.2s linear infinite', transformOrigin: '40px 40px' }}
              />
            </svg>
          </div>
          <p style={styles.generatingText}>Generating your image...</p>
          <p style={styles.generatingHint}>This usually takes 15-30 seconds</p>
          {taskId && (
            <p style={styles.taskId}>Task: {taskId.slice(0, 8)}...</p>
          )}
        </div>
      )}

      {step === 'result' && resultUrl && (
        <div className="animate-in" style={styles.stepContent}>
          <div style={styles.resultImageWrap}>
            <img
              src={resultUrl}
              alt="Generated result"
              style={styles.resultImage}
            />
          </div>
          <div style={styles.resultActions}>
            <a
              href={resultUrl}
              download
              className="accent-btn"
              style={styles.downloadBtn}
              onClick={() => hapticSuccess()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </a>
            <button
              style={styles.newGenBtn}
              onClick={() => {
                haptic('medium')
                setStep('prompt')
                setResultUrl(null)
                setTaskId(null)
                setError(null)
              }}
            >
              Generate Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function OptionButton({ active, onClick, label, description }: {
  active: boolean
  onClick: () => void
  label: string
  description: string
}) {
  return (
    <button
      style={{
        ...optStyles.btn,
        ...(active ? optStyles.btnActive : {}),
      }}
      onClick={onClick}
    >
      <div style={optStyles.radio}>
        {active && <div style={optStyles.radioDot} />}
      </div>
      <div>
        <p style={optStyles.label}>{label}</p>
        <p style={optStyles.desc}>{description}</p>
      </div>
    </button>
  )
}

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = ['prompt', 'references', 'ratio', 'generating', 'result']
  const currentIndex = steps.indexOf(current)

  return (
    <div style={stepStyles.wrap}>
      {['Prompt', 'Refs', 'Ratio', '', ''].map((label, i) => {
        if (!label) return null
        const isActive = i <= currentIndex
        return (
          <div key={i} style={stepStyles.item}>
            <div style={{
              ...stepStyles.dot,
              ...(isActive ? stepStyles.dotActive : {}),
            }} />
            <span style={{
              ...stepStyles.label,
              ...(isActive ? stepStyles.labelActive : {}),
            }}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

const optStyles: Record<string, React.CSSProperties> = {
  btn: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
    padding: '14px 16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.2s ease, background 0.2s ease',
  },
  btnActive: {
    borderColor: 'var(--accent)',
    background: 'rgba(168, 85, 247, 0.08)',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: '2px solid var(--border-strong)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'var(--accent-gradient)',
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text)',
    margin: 0,
  },
  desc: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: '2px 0 0',
  },
}

const stepStyles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    gap: 20,
    marginTop: 12,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    transition: 'background 0.3s ease',
  },
  dotActive: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    transition: 'color 0.3s ease',
  },
  labelActive: {
    color: 'var(--text)',
  },
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
  },
  header: {
    padding: '20px 16px 8px',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text)',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  emptyText: {
    color: 'var(--text-tertiary)',
    fontSize: 15,
  },
  errorBanner: {
    margin: '0 16px 12px',
    padding: '12px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-md)',
    color: '#EF4444',
    fontSize: 13,
  },
  stepContent: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  previewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  },
  previewThumb: {
    width: 48,
    height: 48,
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
  },
  previewLabel: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: 0,
  },
  previewCategory: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text)',
    margin: '2px 0 0',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-tertiary)',
    margin: 0,
  },
  optionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  textareaWrap: {
    position: 'relative',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text)',
    fontSize: 14,
    lineHeight: 1.5,
    outline: 'none',
    resize: 'vertical',
    minHeight: 100,
    transition: 'border-color 0.2s ease',
  },
  nextBtn: {
    width: '100%',
    marginTop: 8,
  },
  refPreview: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: 4,
  },
  refImg: {
    width: 100,
    height: 100,
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    flexShrink: 0,
  },
  ratioGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  ratioBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '16px 8px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease, background 0.2s ease',
  },
  ratioBtnActive: {
    borderColor: 'var(--accent)',
    background: 'rgba(168, 85, 247, 0.08)',
  },
  ratioIcon: {
    fontSize: 18,
    fontFamily: 'monospace',
    color: 'var(--text-secondary)',
  },
  ratioLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text)',
  },
  generatingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: 16,
    padding: '0 32px',
    textAlign: 'center',
  },
  spinner: {
    animation: 'none',
  },
  generatingText: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text)',
    margin: 0,
  },
  generatingHint: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    margin: 0,
  },
  taskId: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    fontFamily: 'monospace',
    margin: 0,
    opacity: 0.5,
  },
  resultImageWrap: {
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  resultImage: {
    width: '100%',
    display: 'block',
  },
  resultActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  downloadBtn: {
    width: '100%',
    textDecoration: 'none',
  },
  newGenBtn: {
    width: '100%',
    padding: '12px 24px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-pill)',
    color: 'var(--text)',
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'transform 0.15s ease, background 0.15s ease',
  },
}
