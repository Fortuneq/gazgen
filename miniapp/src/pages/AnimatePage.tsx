import { useState, useRef } from 'react'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { haptic } from '../telegram'
import { Upload, Play, Clock, Wand2, Film } from 'lucide-react'

type AnimateModel = 'standard' | 'pro' | 'ultra'

const DURATION_VALUES: string[] = ['3с', '5с', '10с']

const ANIMATE_MODELS: { id: AnimateModel; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'pro', label: 'Pro' },
  { id: 'ultra', label: 'Ultra' },
]

export default function AnimatePage() {
  const isDesktop = useIsDesktop()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string>('5с')
  const [selectedModel, setSelectedModel] = useState<AnimateModel>('standard')
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    haptic('light')
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    haptic('light')
  }

  const handleAnimate = () => {
    haptic('medium')
    alert('Функция скоро будет доступна!')
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div style={styles.page} className="safe-bottom">
      <div style={{ maxWidth: isDesktop ? 720 : '100%', margin: '0 auto' }}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Анимация</h1>
          <p style={styles.subtitle}>Преврати фото в видео</p>
        </div>

        {/* Upload area */}
        <div style={styles.uploadSection}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div
            style={{
              ...styles.uploadArea,
              ...(isDragOver ? styles.uploadAreaDragOver : {}),
              ...(previewUrl ? styles.uploadAreaWithPreview : {}),
            }}
            onClick={handleUploadClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <div style={styles.previewWrap}>
                <img src={previewUrl} alt="Preview" style={styles.previewImg} />
                <div style={styles.previewOverlay}>
                  <div style={styles.previewOverlayInner}>
                    <Upload size={20} color="#fff" />
                    <span style={styles.previewOverlayText}>Заменить</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.uploadContent}>
                <div style={styles.uploadIconWrap}>
                  <Upload size={32} color="var(--text-secondary)" />
                </div>
                <p style={styles.uploadTitle}>Загрузи фото</p>
                <p style={styles.uploadSubtitle}>или перетащи сюда</p>
              </div>
            )}
          </div>
        </div>

        {/* Duration selector */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <Clock size={16} color="var(--text-secondary)" />
            <p style={styles.sectionLabel}>Длительность</p>
          </div>
          <div style={styles.pillsRow}>
            {DURATION_VALUES.map((dur) => (
              <button
                key={dur}
                style={{
                  ...styles.pillBtn,
                  ...(selectedDuration === dur ? styles.pillBtnActive : styles.pillBtnInactive),
                }}
                onClick={() => {
                  haptic('light')
                  setSelectedDuration(dur)
                }}
              >
                {dur}
              </button>
            ))}
          </div>
        </div>

        {/* Model selector */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <Wand2 size={16} color="var(--text-secondary)" />
            <p style={styles.sectionLabel}>Модель</p>
          </div>
          <div style={styles.pillsRow}>
            {ANIMATE_MODELS.map((model) => (
              <button
                key={model.id}
                style={{
                  ...styles.pillBtn,
                  ...(selectedModel === model.id ? styles.pillBtnActive : styles.pillBtnInactive),
                }}
                onClick={() => {
                  haptic('light')
                  setSelectedModel(model.id)
                }}
              >
                {model.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info row */}
        {selectedFile && (
          <div style={styles.fileInfo} className="animate-in">
            <Film size={14} color="var(--text-tertiary)" />
            <span style={styles.fileInfoText}>{selectedFile.name}</span>
          </div>
        )}

        {/* CTA */}
        <div style={styles.ctaWrap}>
          <button
            style={{
              ...styles.ctaBtn,
              ...(selectedFile ? styles.ctaBtnEnabled : styles.ctaBtnDisabled),
            }}
            disabled={!selectedFile}
            onClick={handleAnimate}
          >
            <Play size={18} color={selectedFile ? '#0A0A0A' : 'var(--text-tertiary)'} />
            Анимировать ✨
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '0 0 40px',
    color: 'var(--text)',
  },
  header: {
    padding: '24px 16px 20px',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    fontFamily: 'var(--font-heading)',
    color: 'var(--text)',
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: 0,
    fontFamily: 'var(--font-body)',
  },
  uploadSection: {
    padding: '0 16px 20px',
  },
  uploadArea: {
    border: '2px dashed var(--border)',
    borderRadius: 20,
    minHeight: 220,
    cursor: 'pointer',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color 0.2s ease, background 0.2s ease',
    background: 'var(--surface)',
  },
  uploadAreaDragOver: {
    borderColor: '#C4F82A',
    background: 'rgba(196, 248, 42, 0.05)',
  },
  uploadAreaWithPreview: {
    minHeight: 260,
    padding: 0,
  },
  uploadContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    padding: '32px 24px',
  },
  uploadIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'var(--font-heading)',
    color: 'var(--text)',
    margin: 0,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    margin: 0,
    fontFamily: 'var(--font-body)',
  },
  previewWrap: {
    width: '100%',
    height: '100%',
    position: 'relative',
    minHeight: 260,
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    minHeight: 260,
  },
  previewOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  previewOverlayInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  previewOverlayText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
  },
  section: {
    padding: '0 16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    margin: 0,
    fontFamily: 'var(--font-body)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  pillsRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  pillBtn: {
    padding: '8px 20px',
    borderRadius: 'var(--radius-pill)',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    border: '1px solid var(--border)',
    transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
  },
  pillBtnActive: {
    background: '#C4F82A',
    color: '#0A0A0A',
    borderColor: '#C4F82A',
  },
  pillBtnInactive: {
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 16px 16px',
  },
  fileInfoText: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  ctaWrap: {
    padding: '4px 16px 0',
  },
  ctaBtn: {
    width: '100%',
    padding: '14px 24px',
    borderRadius: 'var(--radius-pill)',
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'opacity 0.2s ease',
  },
  ctaBtnEnabled: {
    background: '#C4F82A',
    color: '#0A0A0A',
  },
  ctaBtnDisabled: {
    background: 'var(--surface)',
    color: 'var(--text-tertiary)',
    cursor: 'not-allowed',
    border: '1px solid var(--border)',
  },
}
