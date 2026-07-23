import { useState } from 'react'
import { API_BASE } from '../config'

interface AnalysisResult {
  extracted_skills: {
    by_category: Record<string, string[]>
    all_skills: string[]
    total_found: number
  }
  skill_match: {
    matching: string[]
    missing: string[]
    match_percentage: number
    summary: string
  }
  recommended_projects: {
    selected: Array<{
      name: string
      score: number
      stack: string[]
    }>
    warning: string | null
  }
  message: string
}

export default function AnalyzeJD() {
  const [jdText, setJdText] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [teamFocus, setTeamFocus] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const analyze = async () => {
    if (!jdText.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`${API_BASE}/api/resumes/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd_text: jdText,
          company: company || 'Company',
          role: role || 'Software Engineer Intern',
          team_focus: teamFocus,
        }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Failed to connect to JobOS API. Make sure the backend is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  const downloadResume = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`${API_BASE}/api/resumes/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd_text: jdText,
          company: company || 'Company',
          role: role || 'Software Engineer Intern',
          team_focus: teamFocus,
        }),
      })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Vishwaa_Shah_${company || 'Resume'}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setError('Failed to generate resume.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-ink-900 tracking-tight">Analyze Job Description</h2>
        <p className="text-ink-900/50 mt-1">Paste a JD to get skill match and a tailored resume</p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-2xl border border-ink-900/5 p-6 mb-6 shadow-sm">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-ink-900/70 mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="Rivian, Google..."
              className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-900/70 mb-1">Role</label>
            <input
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="Software Engineer Intern"
              className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-900/70 mb-1">Team Focus</label>
            <input
              type="text"
              value={teamFocus}
              onChange={e => setTeamFocus(e.target.value)}
              placeholder="vehicle telemetry, AI platform..."
              className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink-900/70 mb-1">Job Description</label>
          <textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={8}
            className="w-full px-4 py-3 border border-ink-900/10 bg-cream-100/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
          />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={analyze}
            disabled={loading || !jdText.trim()}
            className="px-6 py-2.5 bg-gold-400 text-ink-900 rounded-full text-sm font-bold hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '⏳ Analyzing...' : '⚡ Analyze JD'}
          </button>
          {result && (
            <button
              onClick={downloadResume}
              disabled={downloading}
              className="px-6 py-2.5 bg-ink-900 text-cream-50 rounded-full text-sm font-bold hover:bg-ink-800 disabled:opacity-50 transition-colors"
            >
              {downloading ? '⏳ Generating...' : '⬇ Download Resume PDF'}
            </button>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">

          {/* Match Score */}
          <div className="bg-white rounded-2xl border border-ink-900/5 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-ink-900">Skill Match</h3>
              <span className={`text-3xl font-extrabold ${
                result.skill_match.match_percentage >= 80 ? 'text-emerald-600' :
                result.skill_match.match_percentage >= 60 ? 'text-gold-500' : 'text-red-500'
              }`}>
                {result.skill_match.match_percentage}%
              </span>
            </div>
            <div className="w-full bg-cream-200 rounded-full h-2 mb-5">
              <div
                className={`h-2 rounded-full transition-all ${
                  result.skill_match.match_percentage >= 80 ? 'bg-emerald-500' :
                  result.skill_match.match_percentage >= 60 ? 'bg-gold-400' : 'bg-red-500'
                }`}
                style={{ width: `${result.skill_match.match_percentage}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-ink-900/70 mb-2">✅ You have ({result.skill_match.matching.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.skill_match.matching.map(s => (
                    <span key={s} className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900/70 mb-2">❌ Missing ({result.skill_match.missing.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.skill_match.missing.length === 0 ? (
                    <span className="text-sm text-ink-900/30">None — perfect match!</span>
                  ) : result.skill_match.missing.map(s => (
                    <span key={s} className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Skills Found */}
          <div className="bg-white rounded-2xl border border-ink-900/5 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-ink-900 mb-4">
              Skills Found in JD ({result.extracted_skills.total_found})
            </h3>
            <div className="space-y-2">
              {Object.entries(result.extracted_skills.by_category).map(([cat, skills]) => (
                <div key={cat} className="flex items-start gap-3">
                  <span className="text-sm font-semibold text-ink-900/40 w-24 capitalize shrink-0 pt-0.5">{cat}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(s => (
                      <span key={s} className="px-2.5 py-0.5 bg-gold-300/30 text-ink-900/80 border border-gold-400/30 rounded-full text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div className="bg-white rounded-2xl border border-ink-900/5 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-ink-900 mb-4">Recommended Projects</h3>
            {result.recommended_projects.warning && (
              <div className="mb-4 p-3 bg-gold-300/20 border border-gold-400/40 rounded-xl text-sm text-ink-900/80">
                ⚠️ {result.recommended_projects.warning}
              </div>
            )}
            <div className="space-y-3">
              {result.recommended_projects.selected.map((project, i) => (
                <div key={project.name} className="flex items-center gap-4 p-3 rounded-2xl border border-ink-900/5 bg-cream-100/50">
                  <div className="w-8 h-8 rounded-full bg-ink-900 text-cream-50 flex items-center justify-center text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink-900">{project.name}</p>
                    <p className="text-xs text-ink-900/50 mt-0.5">{project.stack.slice(0, 5).join(' · ')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-ink-900">{project.score}</span>
                    <p className="text-xs text-ink-900/40">score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
