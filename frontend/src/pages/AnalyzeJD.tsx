import { useState } from 'react'

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
      const res = await fetch('http://localhost:8000/api/resumes/analyze', {
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
      const res = await fetch('http://localhost:8000/api/resumes/generate-pdf', {
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
        <h2 className="text-2xl font-bold text-gray-900">Analyze Job Description</h2>
        <p className="text-gray-500 mt-1">Paste a JD to get skill match and a tailored resume</p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="Rivian, Google..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="Software Engineer Intern"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Focus</label>
            <input
              type="text"
              value={teamFocus}
              onChange={e => setTeamFocus(e.target.value)}
              placeholder="vehicle telemetry, AI platform..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
          <textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={analyze}
            disabled={loading || !jdText.trim()}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '⏳ Analyzing...' : '⚡ Analyze JD'}
          </button>
          {result && (
            <button
              onClick={downloadResume}
              disabled={downloading}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Skill Match</h3>
              <span className={`text-3xl font-bold ${
                result.skill_match.match_percentage >= 80 ? 'text-green-600' :
                result.skill_match.match_percentage >= 60 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {result.skill_match.match_percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-5">
              <div
                className={`h-2 rounded-full transition-all ${
                  result.skill_match.match_percentage >= 80 ? 'bg-green-500' :
                  result.skill_match.match_percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${result.skill_match.match_percentage}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">✅ You have ({result.skill_match.matching.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.skill_match.matching.map(s => (
                    <span key={s} className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">❌ Missing ({result.skill_match.missing.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.skill_match.missing.length === 0 ? (
                    <span className="text-sm text-gray-400">None — perfect match!</span>
                  ) : result.skill_match.missing.map(s => (
                    <span key={s} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Skills Found */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Skills Found in JD ({result.extracted_skills.total_found})
            </h3>
            <div className="space-y-2">
              {Object.entries(result.extracted_skills.by_category).map(([cat, skills]) => (
                <div key={cat} className="flex items-start gap-3">
                  <span className="text-sm font-medium text-gray-400 w-24 capitalize shrink-0 pt-0.5">{cat}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Projects</h3>
            {result.recommended_projects.warning && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                ⚠️ {result.recommended_projects.warning}
              </div>
            )}
            <div className="space-y-3">
              {result.recommended_projects.selected.map((project, i) => (
                <div key={project.name} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{project.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{project.stack.slice(0, 5).join(' · ')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-blue-600">{project.score}</span>
                    <p className="text-xs text-gray-400">score</p>
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
