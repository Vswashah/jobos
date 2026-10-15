import { useState } from 'react'
import { Download, Zap, Info } from 'lucide-react'
import { apiFetch } from '../api'
import Mascot from '../components/Mascot'
import { Button, Card, CardHeader, Chip, Field, inputCls } from '../components/ui'

interface AnalysisResult {
  extracted_skills: { by_category: Record<string, string[]>; total_found: number }
  skill_match: { matching: string[]; missing: string[]; match_percentage: number }
  recommended_projects: { selected: { name: string; score: number; stack: string[] }[]; warning: string | null }
}

const MIN_CHARS = 100
const MAX_CHARS = 20000

export default function AnalyzeJD() {
  const [jdText, setJdText] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [teamFocus, setTeamFocus] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const len = jdText.trim().length
  const tooShort = len > 0 && len < MIN_CHARS
  const body = () => JSON.stringify({
    jd_text: jdText, company: company || 'Company', role: role || 'Software Engineer Intern', team_focus: teamFocus,
  })
  const post = (path: string) => apiFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body() })

  const analyze = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await post('/api/resumes/analyze')
      if (!res.ok) throw new Error()
      setResult(await res.json())
    } catch {
      setError("We couldn't analyze that job description. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const downloadResume = async () => {
    setDownloading(true)
    setError('')
    try {
      const res = await post('/api/resumes/generate-pdf')
      if (!res.ok) throw new Error(res.status === 400 ? (await res.json()).detail : undefined)
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      const m = (res.headers.get('content-disposition') || '').match(/filename="?([^"]+)"?/)
      a.download = m ? m[1] : `${company || 'Resume'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We couldn't generate the resume PDF. Try again in a moment.")
    } finally {
      setDownloading(false)
    }
  }

  const pct = result?.skill_match.match_percentage ?? 0
  const bar = pct >= 80 ? 'bg-ok' : pct >= 60 ? 'bg-accent' : 'bg-bad'

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analyze a job description</h2>
        <p className="text-muted mt-1">See how your profile matches, which projects to lead with, and get a tailored resume.</p>
      </div>

      <Card>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <Field label="Company"><input className={inputCls} value={company} onChange={e => setCompany(e.target.value)} placeholder="Rivian" /></Field>
          <Field label="Role"><input className={inputCls} value={role} onChange={e => setRole(e.target.value)} placeholder="Software Engineer Intern" /></Field>
          <Field label="Team focus (optional)"><input className={inputCls} value={teamFocus} onChange={e => setTeamFocus(e.target.value)} placeholder="vehicle telemetry" /></Field>
        </div>
        <Field label="Job description">
          <textarea
            value={jdText} onChange={e => setJdText(e.target.value)} maxLength={MAX_CHARS} rows={9}
            aria-describedby="jd-help" aria-invalid={tooShort}
            placeholder="Paste the full job description here…"
            className="w-full px-4 py-3 rounded-xl border border-line bg-white text-sm resize-y"
          />
        </Field>
        <div id="jd-help" className="flex justify-between gap-3 text-xs mt-1.5">
          <span className={tooShort ? 'text-bad' : 'text-muted'}>{tooShort ? `Paste at least ${MIN_CHARS} characters for a useful result.` : ''}</span>
          <span className="text-muted tabular-nums">{len.toLocaleString()} / {MAX_CHARS.toLocaleString()}</span>
        </div>
        <p className="flex gap-2 text-xs text-muted mt-3"><Info className="size-4 shrink-0" aria-hidden />
          The job description you paste is saved to your account. Avoid pasting personal information you don't need to.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="primary" onClick={analyze} disabled={loading || len < MIN_CHARS}><Zap className="size-4" />{loading ? 'Analyzing…' : 'Analyze JD'}</Button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-bad">{error} <button className="underline font-semibold" onClick={result ? downloadResume : analyze}>Retry</button></p>}
      </Card>

      {loading && (
        <Card className="flex items-center gap-4" aria-live="polite">
          <Mascot size={88} mood="think" />
          <div><p className="font-semibold">Reading the job description…</p><p className="text-sm text-muted">Matching it against your skills and projects.</p></div>
        </Card>
      )}

      {result && (
        <>
          <Card>
            <CardHeader title="Skill match" subtitle="Share of skills found in this JD that appear on your profile. This is keyword matching, not a hiring prediction."
              action={<span className="text-3xl font-bold">{pct}%</span>} />
            <div className="h-2 rounded-full bg-stone mb-5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Skill match">
              <div className={`h-2 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold mb-2">On your profile ({result.skill_match.matching.length})</p>
                <div className="flex flex-wrap gap-1.5">{result.skill_match.matching.map(s => <Chip key={s} tone="ok">{s}</Chip>)}</div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Not on your profile ({result.skill_match.missing.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.skill_match.missing.length === 0 ? <span className="text-sm text-muted">Every skill in this JD is on your profile.</span>
                    : result.skill_match.missing.map(s => <Chip key={s} tone="bad">{s}</Chip>)}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Skills found in the JD" subtitle={`${result.extracted_skills.total_found} detected`} />
            <dl className="space-y-2">
              {Object.entries(result.extracted_skills.by_category).map(([cat, skills]) => (
                <div key={cat} className="flex gap-3">
                  <dt className="text-sm text-muted w-24 capitalize shrink-0 pt-1">{cat}</dt>
                  <dd className="flex flex-wrap gap-1.5">{skills.map(s => <Chip key={s} tone="accent">{s}</Chip>)}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Projects to lead with" subtitle="Ranked from your own projects by overlap with this JD" />
            {result.recommended_projects.warning && <p className="mb-3 p-3 rounded-xl bg-accent-soft text-sm">{result.recommended_projects.warning}</p>}
            <ol className="space-y-2">
              {result.recommended_projects.selected.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-line">
                  <span className="size-8 rounded-full bg-ink-900 text-white grid place-items-center text-sm font-bold shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{p.name}</p><p className="text-xs text-muted truncate">{p.stack.slice(0, 5).join(' · ')}</p></div>
                  <span className="text-sm font-bold" title="Relevance score">{p.score}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-bold">Tailored resume</h3><p className="text-xs text-muted">Built from your profile, using the projects and experience above. Exports as PDF.</p></div>
            <Button variant="primary" onClick={downloadResume} disabled={downloading}><Download className="size-4" />{downloading ? 'Generating…' : 'Download PDF'}</Button>
          </Card>
        </>
      )}
    </div>
  )
}
