import { useState } from 'react'
import { getUserProfile } from '../api'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { User, Zap, Image, Film, Settings, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type FilterTab = 'all' | 'photo' | 'video'

export default function ProfilePage() {
  const profile = getUserProfile()
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const filterTabs: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Все', icon: null },
    { id: 'photo', label: 'Фото', icon: <Image size={14} /> },
    { id: 'video', label: 'Видео', icon: <Film size={14} /> },
  ]

  const settingsItems = [
    { label: 'Язык', icon: <Settings size={16} /> },
    { label: 'Уведомления', icon: <Settings size={16} /> },
    { label: 'О приложении', icon: <Settings size={16} /> },
  ]

  const gridCols = isDesktop ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)'

  return (
    <div style={styles.page} className="safe-bottom">
      <div style={{ maxWidth: isDesktop ? 800 : '100%', margin: '0 auto' }}>
        {/* Avatar section */}
        <div style={styles.avatarSection}>
          <div style={styles.avatarWrap}>
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.username}
                style={styles.avatarImg}
              />
            ) : (
              <div style={styles.avatarFallback}>
                <User size={36} color="var(--text-secondary)" />
              </div>
            )}
          </div>
          <p style={styles.username}>@{profile.username}</p>
          <p style={styles.fullName}>
            {profile.firstName}{profile.lastName ? ` ${profile.lastName}` : ''}
          </p>
        </div>

        {/* Credits card */}
        <div style={styles.creditsCard}>
          <div style={styles.creditsRow}>
            <div style={styles.creditsLeft}>
              <Zap size={20} color="#C4F82A" />
              <span style={styles.creditsLabel}>Баланс кредитов</span>
            </div>
            <span style={styles.creditsAmount}>{profile.credits}</span>
          </div>
          <button
            style={styles.topUpBtn}
            onClick={() => navigate('/pricing')}
          >
            Пополнить
          </button>
        </div>

        {/* Filter tabs */}
        <div style={styles.tabsRow}>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : styles.tabBtnInactive),
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Generation grid */}
        <div style={{ ...styles.grid, gridTemplateColumns: gridCols }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={styles.gridCard}>
              <div style={styles.gridCardInner}>
                <p style={styles.gridCardText}>
                  Скоро здесь будут<br />ваши работы
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Settings section */}
        <div style={styles.settingsSection}>
          <p style={styles.sectionLabel}>Настройки</p>
          <div style={styles.settingsList}>
            {settingsItems.map((item, i) => (
              <button key={i} style={styles.settingsItem}>
                <div style={styles.settingsItemLeft}>
                  <span style={styles.settingsIcon}>{item.icon}</span>
                  <span style={styles.settingsLabel}>{item.label}</span>
                </div>
                <ChevronRight size={16} color="var(--text-tertiary)" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '0 0 32px',
    color: 'var(--text)',
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 16px 24px',
    gap: 8,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    overflow: 'hidden',
    border: '2px solid var(--border)',
    marginBottom: 4,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    background: 'var(--surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 18,
    fontWeight: 700,
    fontFamily: 'var(--font-heading)',
    color: 'var(--text)',
    margin: 0,
  },
  fullName: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: 0,
  },
  creditsCard: {
    margin: '0 16px 20px',
    padding: 20,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  creditsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creditsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  creditsLabel: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
  },
  creditsAmount: {
    fontSize: 28,
    fontWeight: 700,
    fontFamily: 'var(--font-heading)',
    color: '#C4F82A',
  },
  topUpBtn: {
    width: '100%',
    padding: '12px 24px',
    background: '#C4F82A',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: 'var(--radius-pill)',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
  tabsRow: {
    display: 'flex',
    gap: 8,
    padding: '0 16px 16px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
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
  tabBtnActive: {
    background: '#C4F82A',
    color: '#0A0A0A',
    borderColor: '#C4F82A',
  },
  tabBtnInactive: {
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
  },
  grid: {
    display: 'grid',
    gap: 8,
    padding: '0 16px 24px',
  },
  gridCard: {
    height: 200,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  gridCardInner: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  gridCardText: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    lineHeight: 1.6,
    margin: 0,
    fontFamily: 'var(--font-body)',
  },
  settingsSection: {
    padding: '0 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-tertiary)',
    margin: 0,
    fontFamily: 'var(--font-body)',
  },
  settingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  settingsItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.15s ease',
  },
  settingsItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  settingsIcon: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-secondary)',
  },
  settingsLabel: {
    fontSize: 15,
    color: 'var(--text)',
    fontFamily: 'var(--font-body)',
  },
}
