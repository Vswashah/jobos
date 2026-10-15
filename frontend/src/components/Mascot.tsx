export type Mood = 'happy' | 'wave' | 'think' | 'oops' | 'celebrate' | 'sleep' | 'fire'

const GREEN = '#5e9e6e'
const DARK = '#3f7d58'
const INK = '#262624'

const Eye = ({ x, dx = 0, dy = 0 }: { x: number; dx?: number; dy?: number }) => (
  <>
    <circle cx={x} cy={50} r={9} fill="#fff" />
    <circle cx={x + 2 + dx} cy={51 + dy} r={5} fill={INK} />
    <circle cx={x + 4 + dx} cy={49 + dy} r={1.8} fill="#fff" />
  </>
)

const Arm = ({ cx, cy, rot }: { cx: number; cy: number; rot: number }) => (
  <ellipse cx={cx} cy={cy} rx={11} ry={5.5} fill="#4f8c5f" transform={`rotate(${rot} ${cx} ${cy})`} />
)

/** Rex, the JobOS dinosaur. Decorative unless `label` is given. Animations respect reduced motion (see index.css). */
export default function Mascot({ size = 64, mood = 'happy', label }: { size?: number; mood?: Mood; label?: string }) {
  const party = mood === 'celebrate'
  return (
    <svg
      viewBox="0 0 160 160" width={size} height={size}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      className={`shrink-0 overflow-visible ${mood === 'celebrate' ? 'mascot-hop' : mood === 'happy' ? '' : mood === 'fire' ? 'mascot-hop' : 'mascot-float'}`}
    >
      <path d="M38 112 C14 112 6 128 10 140 C22 132 34 134 52 134 Z" fill={GREEN} />
      <g fill="#c96442">
        <path d="M52 60 L60 40 L70 58 Z" /><path d="M42 80 L46 58 L58 74 Z" /><path d="M36 102 L36 80 L50 94 Z" />
      </g>
      <ellipse cx="82" cy="106" rx="42" ry="36" fill={GREEN} />
      <ellipse cx="90" cy="112" rx="26" ry="26" fill="#d7ead0" />
      <ellipse cx="66" cy="141" rx="15" ry="7" fill={DARK} /><ellipse cx="102" cy="141" rx="15" ry="7" fill={DARK} />

      {/* arms */}
      {mood === 'wave' && <g className="mascot-wave" style={{ transformOrigin: '112px 104px' }}><Arm cx={126} cy={90} rot={-55} /></g>}
      {mood === 'celebrate' && <><Arm cx={126} cy={88} rot={-55} /><Arm cx={36} cy={82} rot={55} /></>}
      {(mood === 'happy' || mood === 'think' || mood === 'oops' || mood === 'sleep' || mood === 'fire') && <Arm cx={112} cy={104} rot={25} />}

      <rect x="58" y="22" width="76" height="62" rx="30" fill={GREEN} />
      <circle cx="76" cy="68" r="5" fill="#e9a58b" opacity=".75" /><circle cx="126" cy="68" r="5" fill="#e9a58b" opacity=".75" />
      <circle cx="98" cy="62" r="1.5" fill={DARK} /><circle cx="106" cy="62" r="1.5" fill={DARK} />

      {/* eyes + mouth per mood */}
      {mood === 'celebrate' ? (
        <>
          <path d="M78 53 Q86 42 94 53" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M108 53 Q116 42 124 53" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M88 70 Q101 90 114 70 Z" fill={INK} />
          <path d="M94 77 Q101 82 108 77 Q101 74 94 77 Z" fill="#e9a58b" />
        </>
      ) : mood === 'sleep' ? (
        <>
          <path d="M78 52 Q86 59 94 52" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M108 52 Q116 59 124 52" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="101" cy="74" rx="5" ry="4" fill={INK} />
        </>
      ) : (
        <>
          <Eye x={86} dx={mood === 'think' ? -2 : 0} dy={mood === 'think' ? -3 : 0} />
          <Eye x={116} dx={mood === 'think' ? -2 : 0} dy={mood === 'think' ? -3 : 0} />
          {mood === 'oops' && <>
            <path d="M78 44 L94 37" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <path d="M124 44 L108 37" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          </>}
          {mood === 'oops' ? <path d="M90 76 Q96 70 101 76 Q106 82 112 76" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            : mood === 'think' ? <path d="M92 74 L110 74" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            : <path d="M88 71 Q101 82 114 71" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />}
        </>
      )}

      {/* extras */}
      {party && <>
        <path d="M80 28 L98 -2 L116 28 Z" fill="#c96442" /><circle cx="98" cy="-4" r="4" fill="#e9c46a" />
        <path d="M86 20 L110 20" stroke="#f5e7e0" strokeWidth="3" />
        <g><rect x="22" y="22" width="7" height="7" fill="#e9c46a" transform="rotate(20 25 25)" /><rect x="140" y="40" width="7" height="7" fill="#c96442" transform="rotate(-20 143 43)" />
          <circle cx="30" cy="56" r="4" fill="#8ab4d9" /><circle cx="146" cy="14" r="4" fill="#5e9e6e" /><rect x="12" y="76" width="6" height="6" fill="#c96442" /></g>
      </>}
      {mood === 'think' && <g fill="#fff" stroke="#e2e0da" strokeWidth="2">
        <circle cx="140" cy="30" r="4" /><circle cx="148" cy="16" r="6" /><ellipse cx="146" cy="-6" rx="14" ry="10" />
        <text x="146" y="-2" textAnchor="middle" fontSize="12" fontWeight="700" fill={INK} stroke="none">?</text></g>}
      {mood === 'sleep' && <g fill={DARK} fontWeight="700" fontFamily="system-ui"><text x="128" y="26" fontSize="16">z</text><text x="140" y="10" fontSize="12">z</text><text x="150" y="-4" fontSize="9">z</text></g>}
      {mood === 'fire' && <g><path d="M142 44 C128 34 138 22 138 12 C148 20 156 30 152 40 C150 44 146 46 142 44 Z" fill="#e8743b" /><path d="M143 42 C138 38 142 32 143 28 C148 32 150 38 147 42 Z" fill="#f4c542" /></g>}
      {mood === 'oops' && <path d="M138 36 Q144 46 138 50 Q132 46 138 36 Z" fill="#8ab4d9" />}
      {mood === 'wave' && <g fill="none" stroke={DARK} strokeWidth="3" strokeLinecap="round"><path d="M142 62 Q148 58 144 52" /><path d="M148 70 Q156 64 150 56" /></g>}
    </svg>
  )
}
