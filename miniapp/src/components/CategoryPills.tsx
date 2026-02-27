import { useEffect, useState } from 'react'
import type { Category } from '../types'
import { getCategories } from '../api'
import { haptic } from '../telegram'

interface CategoryPillsProps {
  selected: string | null
  onSelect: (category: string | null) => void
}

export default function CategoryPills({ selected, onSelect }: CategoryPillsProps) {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error)
  }, [])

  const handleSelect = (cat: string | null) => {
    haptic('light')
    onSelect(cat)
  }

  return (
    <div style={styles.container} className="hide-scrollbar">
      <button
        style={{
          ...styles.pill,
          ...(selected === null ? styles.pillActive : styles.pillInactive),
        }}
        onClick={() => handleSelect(null)}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.name}
          style={{
            ...styles.pill,
            ...(selected === cat.name ? styles.pillActive : styles.pillInactive),
          }}
          onClick={() => handleSelect(cat.name)}
        >
          {cat.emoji} {cat.name}
          <span style={styles.count}>{cat.post_count}</span>
        </button>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 8,
    padding: '16px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 20px',
    borderRadius: 'var(--radius-pill)',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'transform 0.15s ease, background 0.2s ease',
    cursor: 'pointer',
    border: 'none',
  },
  pillActive: {
    background: '#C4F82A',
    color: '#0A0A0A',
    fontWeight: 600,
  },
  pillInactive: {
    background: '#18181B',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
  },
  count: {
    fontSize: 11,
    opacity: 0.6,
  },
}
