import { useState } from 'react'

interface Point {
  date: string
  count: number
}

interface Props {
  data: Point[]
}

const WIDTH = 300
const HEIGHT = 110
const PAD_TOP = 14
const PAD_BOTTOM = 10

export default function ActivityTrendChart({ data }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (data.length === 0) return <div className="h-[110px]" />

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM
  const stepX = data.length > 1 ? WIDTH / (data.length - 1) : 0

  const xAt = (i: number) => i * stepX
  const yAt = (count: number) => PAD_TOP + plotHeight - (count / maxCount) * plotHeight

  const linePoints = data.map((d, i) => `${xAt(i)},${yAt(d.count)}`).join(' ')
  const areaPoints = `0,${HEIGHT - PAD_BOTTOM} ${linePoints} ${WIDTH},${HEIGHT - PAD_BOTTOM}`

  const lastIndex = data.length - 1
  const active = hoverIndex ?? lastIndex
  const activePoint = data[active]

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH
    const idx = Math.round(relX / stepX)
    setHoverIndex(Math.min(Math.max(idx, 0), lastIndex))
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-[110px] overflow-visible">
        {/* baseline */}
        <line x1={0} y1={HEIGHT - PAD_BOTTOM} x2={WIDTH} y2={HEIGHT - PAD_BOTTOM} stroke="white" strokeOpacity={0.1} strokeWidth={1} />

        {/* area fill */}
        <polygon points={areaPoints} fill="#f2c94c" fillOpacity={0.15} />

        {/* line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#f2c94c"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* crosshair */}
        {hoverIndex !== null && (
          <line
            x1={xAt(hoverIndex)} y1={PAD_TOP}
            x2={xAt(hoverIndex)} y2={HEIGHT - PAD_BOTTOM}
            stroke="white" strokeOpacity={0.25} strokeWidth={1}
          />
        )}

        {/* end/hover marker — 2px surface ring so it stays legible over the line */}
        <circle cx={xAt(active)} cy={yAt(activePoint.count)} r={5} fill="#17160f" />
        <circle cx={xAt(active)} cy={yAt(activePoint.count)} r={4} fill="#f2c94c" />

        {/* hover hit area */}
        <rect
          x={0} y={0} width={WIDTH} height={HEIGHT}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>

      <div className="absolute top-0 right-0 text-right pointer-events-none">
        <div className="text-2xl font-extrabold text-cream-50">{activePoint.count}</div>
        <div className="text-xs text-cream-50/40">{formatDate(activePoint.date)}</div>
      </div>
    </div>
  )
}
