import { useState } from 'react'
import type { ModelTier, ModelInfo } from '../types'
import { MODEL_DATA } from '../api'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { Zap, Image, Film, Crown, Star } from 'lucide-react'

type ContentType = 'photo' | 'video'

const MODEL_ICONS: Record<ModelTier, React.ReactNode> = {
  nano: <Zap size={14} />,
  standard: <Star size={14} />,
  pro: <Crown size={14} />,
  ultra: <Crown size={14} />,
}

export default function PricingPage() {
  const isDesktop = useIsDesktop()
  const [activeModel, setActiveModel] = useState<ModelTier>('standard')
  const [contentType, setContentType] = useState<ContentType>('photo')

  const selectedModel: ModelInfo = MODEL_DATA.find((m) => m.id === activeModel) ?? MODEL_DATA[0]
  const packs = contentType === 'photo' ? selectedModel.photoPacks : selectedModel.videoPacks

  return (
    <div style={styles.page} className="safe-bottom">
      <div style={{ maxWidth: isDesktop ? 1200 : '100%', margin: '0 auto' }}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Тарифы</h1>
        </div>

        {/* Model tabs */}
        <div style={styles.modelTabsWrap} className="hide-scrollbar">
          <div style={styles.modelTabs}>
            {MODEL_DATA.map((model) => (
              <button
                key={model.id}
                style={{
                  ...styles.modelTab,
                  ...(activeModel === model.id ? styles.modelTabActive : styles.modelTabInactive),
                }}
                onClick={() => setActiveModel(model.id)}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {MODEL_ICONS[model.id]}
                </span>
                {model.name}
              </button>
            ))}
          </div>
        </div>

        {/* Model description */}
        <div style={styles.modelDesc}>
          <p style={styles.modelDescText}>{selectedModel.description}</p>
          <div style={styles.creditsInfo}>
            <div style={styles.creditsBadge}>
              <Image size={13} color="var(--text-secondary)" />
              <span style={styles.creditsBadgeText}>
                {selectedModel.creditsPerPhoto} кр/фото
              </span>
            </div>
            <div style={styles.creditsBadge}>
              <Film size={13} color="var(--text-secondary)" />
              <span style={styles.creditsBadgeText}>
                {selectedModel.creditsPerVideo} кр/видео
              </span>
            </div>
          </div>
        </div>

        {/* Type toggle */}
        <div style={styles.typeToggleWrap}>
          <div style={styles.typeToggle}>
            <button
              style={{
                ...styles.typeToggleBtn,
                ...(contentType === 'photo' ? styles.typeToggleBtnActive : styles.typeToggleBtnInactive),
              }}
              onClick={() => setContentType('photo')}
            >
              <Image size={14} />
              Фото
            </button>
            <button
              style={{
                ...styles.typeToggleBtn,
                ...(contentType === 'video' ? styles.typeToggleBtnActive : styles.typeToggleBtnInactive),
              }}
              onClick={() => setContentType('video')}
            >
              <Film size={14} />
              Видео
            </button>
          </div>
        </div>

        {/* Pack cards */}
        <div style={{
          ...styles.packsGrid,
          gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr',
        }}>
          {packs.map((pack) => (
            <div
              key={pack.id}
              style={{
                ...styles.packCard,
                ...(pack.popular ? styles.packCardPopular : {}),
              }}
            >
              {pack.popular && (
                <div style={styles.popularBadge}>
                  <Star size={11} color="#0A0A0A" />
                  Популярный
                </div>
              )}
              <div style={styles.packContent}>
                <div>
                  <p style={styles.packName}>{pack.name}</p>
                  <p style={styles.packPricePerUnit}>
                    {pack.pricePerUnit.toFixed(2)} ₽ за шт
                  </p>
                </div>
                <p style={styles.packPrice}>{pack.price} ₽</p>
              </div>
              <button
                style={{
                  ...styles.buyBtn,
                  ...(pack.popular ? styles.buyBtnPopular : styles.buyBtnDefault),
                }}
              >
                Купить
              </button>
            </div>
          ))}
        </div>

        {/* Credits note */}
        <div style={styles.note}>
          <Zap size={14} color="var(--text-tertiary)" />
          <span style={styles.noteText}>
            Кредиты не имеют срока действия и накапливаются
          </span>
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
    padding: '24px 16px 16px',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    fontFamily: 'var(--font-heading)',
    color: 'var(--text)',
    margin: 0,
  },
  modelTabsWrap: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: '0 16px 16px',
  },
  modelTabs: {
    display: 'flex',
    gap: 8,
    width: 'max-content',
  },
  modelTab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    borderRadius: 'var(--radius-pill)',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    border: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s ease, color 0.15s ease',
    flexShrink: 0,
  },
  modelTabActive: {
    background: '#C4F82A',
    color: '#0A0A0A',
    borderColor: '#C4F82A',
  },
  modelTabInactive: {
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
  },
  modelDesc: {
    margin: '0 16px 20px',
    padding: '16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  modelDescText: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: 0,
    fontFamily: 'var(--font-body)',
    lineHeight: 1.5,
  },
  creditsInfo: {
    display: 'flex',
    gap: 8,
  },
  creditsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-pill)',
  },
  creditsBadgeText: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
  },
  typeToggleWrap: {
    padding: '0 16px 20px',
    display: 'flex',
  },
  typeToggle: {
    display: 'flex',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-pill)',
    padding: 4,
    gap: 4,
  },
  typeToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    borderRadius: 'var(--radius-pill)',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    border: 'none',
    transition: 'background 0.15s ease, color 0.15s ease',
  },
  typeToggleBtnActive: {
    background: '#C4F82A',
    color: '#0A0A0A',
  },
  typeToggleBtnInactive: {
    background: 'transparent',
    color: 'var(--text-secondary)',
  },
  packsGrid: {
    display: 'grid',
    gap: 12,
    padding: '0 16px 20px',
  },
  packCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    position: 'relative',
    overflow: 'hidden',
    transition: 'border-color 0.2s ease',
  },
  packCardPopular: {
    borderColor: '#C4F82A',
  },
  popularBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    background: '#C4F82A',
    color: '#0A0A0A',
    borderRadius: 'var(--radius-pill)',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
  },
  packContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingRight: 80,
  },
  packName: {
    fontSize: 18,
    fontWeight: 700,
    fontFamily: 'var(--font-heading)',
    color: 'var(--text)',
    margin: '0 0 4px',
  },
  packPricePerUnit: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    margin: 0,
    fontFamily: 'var(--font-body)',
  },
  packPrice: {
    fontSize: 22,
    fontWeight: 700,
    fontFamily: 'var(--font-heading)',
    color: 'var(--text)',
    margin: 0,
    flexShrink: 0,
  },
  buyBtn: {
    width: '100%',
    padding: '12px 24px',
    borderRadius: 'var(--radius-pill)',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.15s ease',
  },
  buyBtnPopular: {
    background: '#C4F82A',
    color: '#0A0A0A',
  },
  buyBtnDefault: {
    background: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  },
  note: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 16px',
  },
  noteText: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-body)',
  },
}
