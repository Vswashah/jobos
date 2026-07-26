import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

interface Props {
  userName: string
  onComplete: () => void
}

type Step = 'status' | 'education' | 'skills' | 'projects' | 'preferences'

const STEPS: { id: Step; label: string }[] = [
  { id: 'status', label: 'Your Status' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'preferences', label: 'Job Preferences' },
]

interface EducationEntry {
  degree: string
  school: string
  track: string
  relevant_courses: string
  start_date: string
  end_date: string
}

interface ProjectEntry {
  name: string
  description: string
  stack: string
  github_url: string
  live_url: string
  is_live: boolean
}

const emptyEducation: EducationEntry = { degree: '', school: '', track: '', relevant_courses: '', start_date: '', end_date: '' }
const emptyProject: ProjectEntry = { name: '', description: '', stack: '', github_url: '', live_url: '', is_live: false }

const inputClass = 'w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400'
const textareaClass = 'w-full px-4 py-3 border border-ink-900/10 bg-cream-100/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none'
const labelClass = 'block text-sm font-semibold text-ink-900/70 mb-1'

export default function Onboarding({ userName, onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [phone, setPhone] = useState('')
  const [university, setUniversity] = useState('')
  const [degree, setDegree] = useState('')
  const [graduationDate, setGraduationDate] = useState('')
  const [visaStatus, setVisaStatus] = useState('F-1')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')

  const [jobType, setJobType] = useState('full-time')
  const [remotePreference, setRemotePreference] = useState('any')
  const [targetRoles, setTargetRoles] = useState('')
  const [preferredLocations, setPreferredLocations] = useState('')

  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([{ ...emptyEducation }])
  const [skillsText, setSkillsText] = useState('')
  const [projectEntries, setProjectEntries] = useState<ProjectEntry[]>([{ ...emptyProject }])

  useEffect(() => {
    apiFetch('/api/profile/')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const p = data?.personal
        if (!p) return
        setPhone(p.phone || '')
        setUniversity(p.university || '')
        setDegree(p.degree || '')
        setGraduationDate(p.graduation_date || '')
        setVisaStatus(p.visa_status || 'F-1')
        setLinkedinUrl(p.linkedin_url || '')
        setGithubUrl(p.github_url || '')
        setPortfolioUrl(p.portfolio_url || '')
        setJobType(p.job_type || 'full-time')
        setRemotePreference(p.remote_preference || 'any')
        setTargetRoles((p.target_roles || []).join(', '))
        setPreferredLocations((p.preferred_locations || []).join(', '))
        if (data.education?.length) {
          setEducationEntries(data.education.map((e: any) => ({
            degree: e.degree || '', school: e.school || '', track: e.track || '',
            relevant_courses: e.relevant_courses || '', start_date: e.start_date || '', end_date: e.end_date || '',
          })))
        }
        if (data.skills?.length) setSkillsText(data.skills.map((s: any) => s.name).join(', '))
        if (data.projects?.length) {
          setProjectEntries(data.projects.map((p: any) => ({
            name: p.name || '', description: p.description || '', stack: (p.stack || []).join(', '),
            github_url: p.github_url || '', live_url: p.live_url || '', is_live: !!p.is_live,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const savePersonalAndPreferences = async () => {
    const res = await apiFetch('/api/profile/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: userName,
        phone: phone || null,
        linkedin_url: linkedinUrl || null,
        github_url: githubUrl || null,
        portfolio_url: portfolioUrl || null,
        university: university || null,
        degree: degree || null,
        graduation_date: graduationDate || null,
        visa_status: visaStatus || null,
        job_type: jobType || null,
        remote_preference: remotePreference || null,
        target_roles: targetRoles.split(',').map(s => s.trim()).filter(Boolean),
        preferred_locations: preferredLocations.split(',').map(s => s.trim()).filter(Boolean),
      }),
    })
    if (!res.ok) throw new Error('Failed to save — please try again')
  }

  const saveEducation = async () => {
    for (const entry of educationEntries) {
      if (!entry.degree.trim() || !entry.school.trim()) continue
      await apiFetch('/api/profile/education', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          degree: entry.degree, school: entry.school,
          track: entry.track || null, relevant_courses: entry.relevant_courses || null,
          start_date: entry.start_date || null, end_date: entry.end_date || null,
        }),
      })
    }
  }

  const saveSkills = async () => {
    const names = [...new Set(skillsText.split(',').map(s => s.trim()).filter(Boolean))]
    for (const name of names) {
      // 409 means it's already saved (e.g. revisiting this step) — not an error.
      await apiFetch('/api/profile/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
    }
  }

  const saveProjects = async () => {
    for (const entry of projectEntries) {
      if (!entry.name.trim()) continue
      await apiFetch('/api/profile/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: entry.name,
          description: entry.description,
          stack: entry.stack.split(',').map(s => s.trim()).filter(Boolean),
          github_url: entry.github_url || null,
          live_url: entry.live_url || null,
          is_live: entry.is_live,
          domains: [],
          highlights: [],
        }),
      })
    }
  }

  const step = STEPS[stepIndex]

  const goNext = async () => {
    setError('')
    setSaving(true)
    try {
      if (step.id === 'status') await savePersonalAndPreferences()
      if (step.id === 'education') await saveEducation()
      if (step.id === 'skills') await saveSkills()
      if (step.id === 'projects') await saveProjects()
      if (step.id === 'preferences') await savePersonalAndPreferences()

      if (stepIndex === STEPS.length - 1) {
        const res = await apiFetch('/api/profile/complete-onboarding', { method: 'POST' })
        if (!res.ok) throw new Error('Failed to finish onboarding — please try again')
        onComplete()
      } else {
        setStepIndex(i => i + 1)
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const skip = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/profile/complete-onboarding', { method: 'POST' })
      onComplete()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans" style={{ background: 'linear-gradient(135deg, #dcdfe6 0%, #eee6d3 45%, #f6dfa8 100%)' }}>
      <div className="w-full max-w-2xl bg-white rounded-[28px] shadow-2xl p-8">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">Welcome, {userName.split(' ')[0]}</h1>
            <p className="text-ink-900/50 text-sm mt-1">Let's set up your profile so JobOS can tailor resumes for you.</p>
          </div>
          <button onClick={skip} disabled={saving} className="text-xs font-semibold text-ink-900/40 hover:text-ink-900 shrink-0">
            Skip for now
          </button>
        </div>

        <div className="flex items-center gap-2 my-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? 'bg-gold-400' : 'bg-cream-200'}`} />
          ))}
        </div>
        <p className="text-xs font-semibold text-ink-900/40 mb-4 uppercase tracking-wide">
          Step {stepIndex + 1} of {STEPS.length} — {step.label}
        </p>

        <div className="max-h-[50vh] overflow-y-auto pr-1">
          {step.id === 'status' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>University</label>
                  <input type="text" value={university} onChange={e => setUniversity(e.target.value)} placeholder="e.g. UT Dallas" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Degree</label>
                  <input type="text" value={degree} onChange={e => setDegree(e.target.value)} placeholder="e.g. M.S. Computer Science" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Graduation date</label>
                  <input type="date" value={graduationDate} onChange={e => setGraduationDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Visa status</label>
                  <select value={visaStatus} onChange={e => setVisaStatus(e.target.value)} className={inputClass}>
                    {['F-1', 'OPT', 'STEM OPT', 'H-1B', 'Green Card', 'Citizen', 'Other'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" className={inputClass} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>LinkedIn</label>
                  <input type="text" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="Optional" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>GitHub</label>
                  <input type="text" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="Optional" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Portfolio</label>
                  <input type="text" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="Optional" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {step.id === 'education' && (
            <div className="space-y-4">
              {educationEntries.map((entry, i) => (
                <div key={i} className="p-4 rounded-2xl border border-ink-900/5 bg-cream-100/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-ink-900/40 uppercase tracking-wide">Entry {i + 1}</p>
                    {educationEntries.length > 1 && (
                      <button
                        onClick={() => setEducationEntries(es => es.filter((_, idx) => idx !== i))}
                        className="text-xs font-semibold text-ink-900/40 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={entry.degree} onChange={e => setEducationEntries(es => es.map((x, idx) => idx === i ? { ...x, degree: e.target.value } : x))} placeholder="Degree (e.g. M.S. Computer Science)" className={inputClass} />
                    <input type="text" value={entry.school} onChange={e => setEducationEntries(es => es.map((x, idx) => idx === i ? { ...x, school: e.target.value } : x))} placeholder="School" className={inputClass} />
                  </div>
                  <input type="text" value={entry.track} onChange={e => setEducationEntries(es => es.map((x, idx) => idx === i ? { ...x, track: e.target.value } : x))} placeholder="Track / concentration (optional)" className={inputClass} />
                  <textarea value={entry.relevant_courses} onChange={e => setEducationEntries(es => es.map((x, idx) => idx === i ? { ...x, relevant_courses: e.target.value } : x))} rows={2} placeholder="Relevant coursework (optional)" className={textareaClass} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={entry.start_date} onChange={e => setEducationEntries(es => es.map((x, idx) => idx === i ? { ...x, start_date: e.target.value } : x))} className={inputClass} />
                    <input type="date" value={entry.end_date} onChange={e => setEducationEntries(es => es.map((x, idx) => idx === i ? { ...x, end_date: e.target.value } : x))} className={inputClass} />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setEducationEntries(es => [...es, { ...emptyEducation }])}
                className="text-sm font-semibold text-ink-900 bg-cream-200 hover:bg-cream-200/70 px-4 py-2 rounded-full"
              >
                + Add another degree
              </button>
            </div>
          )}

          {step.id === 'skills' && (
            <div>
              <label className={labelClass}>Your skills</label>
              <p className="text-xs text-ink-900/40 mb-2">Comma separated — e.g. Python, React, AWS, PostgreSQL</p>
              <textarea
                autoFocus
                value={skillsText}
                onChange={e => setSkillsText(e.target.value)}
                rows={5}
                placeholder="Python, React, AWS, PostgreSQL, Docker..."
                className={textareaClass}
              />
            </div>
          )}

          {step.id === 'projects' && (
            <div className="space-y-4">
              {projectEntries.map((entry, i) => (
                <div key={i} className="p-4 rounded-2xl border border-ink-900/5 bg-cream-100/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-ink-900/40 uppercase tracking-wide">Project {i + 1}</p>
                    {projectEntries.length > 1 && (
                      <button
                        onClick={() => setProjectEntries(ps => ps.filter((_, idx) => idx !== i))}
                        className="text-xs font-semibold text-ink-900/40 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input type="text" value={entry.name} onChange={e => setProjectEntries(ps => ps.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} placeholder="Project name" className={inputClass} />
                  <textarea value={entry.description} onChange={e => setProjectEntries(ps => ps.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} rows={2} placeholder="One-line description" className={textareaClass} />
                  <input type="text" value={entry.stack} onChange={e => setProjectEntries(ps => ps.map((x, idx) => idx === i ? { ...x, stack: e.target.value } : x))} placeholder="Stack (comma separated)" className={inputClass} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={entry.github_url} onChange={e => setProjectEntries(ps => ps.map((x, idx) => idx === i ? { ...x, github_url: e.target.value } : x))} placeholder="GitHub URL" className={inputClass} />
                    <input type="text" value={entry.live_url} onChange={e => setProjectEntries(ps => ps.map((x, idx) => idx === i ? { ...x, live_url: e.target.value } : x))} placeholder="Live URL" className={inputClass} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-ink-900/70">
                    <input type="checkbox" checked={entry.is_live} onChange={e => setProjectEntries(ps => ps.map((x, idx) => idx === i ? { ...x, is_live: e.target.checked } : x))} className="rounded border-ink-900/20 text-gold-400 focus:ring-gold-400" />
                    This project is live
                  </label>
                </div>
              ))}
              <button
                onClick={() => setProjectEntries(ps => [...ps, { ...emptyProject }])}
                className="text-sm font-semibold text-ink-900 bg-cream-200 hover:bg-cream-200/70 px-4 py-2 rounded-full"
              >
                + Add another project
              </button>
            </div>
          )}

          {step.id === 'preferences' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Job type</label>
                  <select value={jobType} onChange={e => setJobType(e.target.value)} className={inputClass}>
                    {['internship', 'co-op', 'full-time', 'either'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Remote preference</label>
                  <select value={remotePreference} onChange={e => setRemotePreference(e.target.value)} className={inputClass}>
                    {['remote', 'hybrid', 'onsite', 'any'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Target roles</label>
                <input type="text" value={targetRoles} onChange={e => setTargetRoles(e.target.value)} placeholder="e.g. Backend Engineer, SWE, Data Engineer" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Preferred locations</label>
                <input type="text" value={preferredLocations} onChange={e => setPreferredLocations(e.target.value)} placeholder="e.g. Dallas TX, Remote, NYC" className={inputClass} />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-ink-900/5">
          <button
            onClick={() => setStepIndex(i => i - 1)}
            disabled={stepIndex === 0 || saving}
            className="px-4 py-2 text-sm font-semibold text-ink-900/60 hover:bg-cream-200 rounded-full disabled:opacity-0"
          >
            Back
          </button>
          <button
            onClick={goNext}
            disabled={saving}
            className="px-6 py-3 bg-gold-400 text-ink-900 rounded-full text-sm font-bold hover:bg-gold-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : stepIndex === STEPS.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
