import { useState } from 'react'

interface Skill {
  skill: string
  count: number
}

interface Props {
  data: Skill[]
}

export default function TopSkillsChart({ data }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)

  if (data.length === 0) return null
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="space-y-2.5">
      {data.map(item => (
        <div
          key={item.skill}
          className={`flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors ${hovered === item.skill ? 'bg-cream-100/70' : ''}`}
          onMouseEnter={() => setHovered(item.skill)}
          onMouseLeave={() => setHovered(null)}
        >
          <span className="text-sm text-ink-900/70 w-24 shrink-0 truncate capitalize">{item.skill}</span>
          <div className="flex-1 h-4 flex items-center">
            <div
              className="h-4 bg-gold-400 rounded-r-[4px]"
              style={{ width: `${Math.max((item.count / maxCount) * 100, 4)}%` }}
            />
          </div>
          <span className="text-sm font-bold text-ink-900 w-6 text-right shrink-0">{item.count}</span>
        </div>
      ))}
    </div>
  )
}
