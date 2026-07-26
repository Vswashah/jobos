import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { apiFetch } from '../api'

const API = '/api/profile'

interface Skill {
  id: string
  name: string
  category: string
  proficiency: string
}

interface Project {
  id: string
  name: string
  description: string
  stack: string[]
  github_url: string | null
  live_url: string | null
  is_live: boolean
  domains: string[]
  highlights: string[]
}

interface Personal {
  name: string
  email: string
  phone: string | null
  linkedin_url: string | null
  github_url: string | null
  portfolio_url: string | null
  university: string
  degree: string
  graduation_date: string | null
  visa_status: string
  job_type: string | null
  remote_preference: string | null
  target_roles: string[]
  preferred_locations: string[]
}

interface Education {
  id: string
  degree: string
  school: string
  track: string | null
  relevant_courses: string | null
  start_date: string | null
  end_date: string | null
}

const emptyProjectForm = {
  name: '', description: '', stack: '', github_url: '', live_url: '', is_live: false,
}

const emptyEducationForm = {
  degree: '', school: '', track: '', relevant_courses: '', start_date: '', end_date: '',
}

const emptyPersonalForm = {
  name: '', phone: '', linkedin_url: '', github_url: '', portfolio_url: '',
  university: '', degree: '', graduation_date: '', visa_status: 'F-1',
}

const emptyPreferencesForm = {
  job_type: 'full-time', remote_preference: 'any', target_roles: '', preferred_locations: '',
}

const inputClass = 'w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400'
const textareaClass = 'w-full px-4 py-3 border border-ink-900/10 bg-cream-100/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none'
const labelClass = 'block text-sm font-semibold text-ink-900/70 mb-1'

export default function Profile() {
  const [personal, setPersonal] = useState<Personal | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [education, setEducation] = useState<Education[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [toast, setToast] = useState<{ message: string; kind?: 'success' | 'error' } | null>(null)

  const [skillModalOpen, setSkillModalOpen] = useState(false)
  const [skillName, setSkillName] = useState('')
  const [skillCategory, setSkillCategory] = useState('other')
  const [savingSkill, setSavingSkill] = useState(false)

  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState(emptyProjectForm)
  const [savingProject, setSavingProject] = useState(false)

  const [educationModalOpen, setEducationModalOpen] = useState(false)
  const [editingEducationId, setEditingEducationId] = useState<string | null>(null)
  const [educationForm, setEducationForm] = useState(emptyEducationForm)
  const [savingEducation, setSavingEducation] = useState(false)

  const [personalModalOpen, setPersonalModalOpen] = useState(false)
  const [personalForm, setPersonalForm] = useState(emptyPersonalForm)
  const [savingPersonal, setSavingPersonal] = useState(false)

  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false)
  const [preferencesForm, setPreferencesForm] = useState(emptyPreferencesForm)
  const [savingPreferences, setSavingPreferences] = useState(false)

  const loadProfile = () => {
    setLoading(true)
    setLoadError(false)
    apiFetch(`${API}/`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load profile')
        return r.json()
      })
      .then(data => {
        setPersonal(data.personal)
        setSkills(data.skills || [])
        setProjects(data.projects || [])
        setEducation(data.education || [])
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(loadProfile, [])

  const notify = (message: string, kind: 'success' | 'error' = 'success') => setToast({ message, kind })

  // ── Personal info ───────────────────────────────────────────────────────
  const openEditPersonal = () => {
    if (!personal) return
    setPersonalForm({
      name: personal.name,
      phone: personal.phone || '',
      linkedin_url: personal.linkedin_url || '',
      github_url: personal.github_url || '',
      portfolio_url: personal.portfolio_url || '',
      university: personal.university || '',
      degree: personal.degree || '',
      graduation_date: personal.graduation_date || '',
      visa_status: personal.visa_status || 'F-1',
    })
    setPersonalModalOpen(true)
  }

  const submitPersonal = async () => {
    const name = personalForm.name.trim()
    if (!name) return
    setSavingPersonal(true)
    try {
      const res = await apiFetch(`${API}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: personalForm.phone || null,
          linkedin_url: personalForm.linkedin_url || null,
          github_url: personalForm.github_url || null,
          portfolio_url: personalForm.portfolio_url || null,
          university: personalForm.university || null,
          degree: personalForm.degree || null,
          graduation_date: personalForm.graduation_date || null,
          visa_status: personalForm.visa_status || null,
          job_type: personal?.job_type ?? null,
          remote_preference: personal?.remote_preference ?? null,
          target_roles: personal?.target_roles ?? [],
          preferred_locations: personal?.preferred_locations ?? [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to save profile')
      // Refetch rather than merge personalForm's raw '' placeholders straight
      // into state — the PATCH above already normalized '' to null server
      // side, and a stale '' left in `personal.graduation_date` would fail
      // Pydantic's date validation the next time submitPreferences sends it.
      loadProfile()
      setPersonalModalOpen(false)
      notify('Personal info updated')
    } catch (e: any) {
      notify(e.message || 'Failed to save profile', 'error')
    } finally {
      setSavingPersonal(false)
    }
  }

  // ── Job preferences ─────────────────────────────────────────────────────
  const openEditPreferences = () => {
    if (!personal) return
    setPreferencesForm({
      job_type: personal.job_type || 'full-time',
      remote_preference: personal.remote_preference || 'any',
      target_roles: (personal.target_roles || []).join(', '),
      preferred_locations: (personal.preferred_locations || []).join(', '),
    })
    setPreferencesModalOpen(true)
  }

  const submitPreferences = async () => {
    if (!personal) return
    setSavingPreferences(true)
    const targetRoles = preferencesForm.target_roles.split(',').map(s => s.trim()).filter(Boolean)
    const preferredLocations = preferencesForm.preferred_locations.split(',').map(s => s.trim()).filter(Boolean)
    try {
      const res = await apiFetch(`${API}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personal.name,
          phone: personal.phone,
          linkedin_url: personal.linkedin_url,
          github_url: personal.github_url,
          portfolio_url: personal.portfolio_url,
          university: personal.university,
          degree: personal.degree,
          graduation_date: personal.graduation_date,
          visa_status: personal.visa_status,
          job_type: preferencesForm.job_type,
          remote_preference: preferencesForm.remote_preference,
          target_roles: targetRoles,
          preferred_locations: preferredLocations,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to save preferences')
      setPersonal(p => (p ? { ...p, job_type: preferencesForm.job_type, remote_preference: preferencesForm.remote_preference, target_roles: targetRoles, preferred_locations: preferredLocations } : p))
      setPreferencesModalOpen(false)
      notify('Job preferences updated')
    } catch (e: any) {
      notify(e.message || 'Failed to save preferences', 'error')
    } finally {
      setSavingPreferences(false)
    }
  }

  // ── Education ───────────────────────────────────────────────────────────
  const openAddEducation = () => {
    setEditingEducationId(null)
    setEducationForm(emptyEducationForm)
    setEducationModalOpen(true)
  }

  const openEditEducation = (e: Education) => {
    setEditingEducationId(e.id)
    setEducationForm({
      degree: e.degree,
      school: e.school,
      track: e.track || '',
      relevant_courses: e.relevant_courses || '',
      start_date: e.start_date || '',
      end_date: e.end_date || '',
    })
    setEducationModalOpen(true)
  }

  const submitEducation = async () => {
    const degree = educationForm.degree.trim()
    const school = educationForm.school.trim()
    if (!degree || !school) return
    setSavingEducation(true)
    const payload = {
      degree, school,
      track: educationForm.track || null,
      relevant_courses: educationForm.relevant_courses || null,
      start_date: educationForm.start_date || null,
      end_date: educationForm.end_date || null,
    }
    try {
      const url = editingEducationId ? `${API}/education/${editingEducationId}` : `${API}/education`
      const method = editingEducationId ? 'PATCH' : 'POST'
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to save education')

      if (editingEducationId) {
        setEducation(es => es.map(e => (e.id === editingEducationId ? { ...e, ...payload } : e)))
        notify(`Updated "${degree}"`)
      } else {
        setEducation(es => [...es, { ...payload, id: data.id }])
        notify(`Added "${degree}" to your education`)
      }
      setEducationModalOpen(false)
    } catch (e: any) {
      notify(e.message || 'Failed to save education', 'error')
    } finally {
      setSavingEducation(false)
    }
  }

  const removeEducation = async (e: Education) => {
    if (!confirm(`Remove "${e.degree}" from your education?`)) return
    const prev = education
    setEducation(es => es.filter(x => x.id !== e.id))
    try {
      const res = await apiFetch(`${API}/education/${e.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove education entry')
      notify(`Removed "${e.degree}"`)
    } catch {
      setEducation(prev)
      notify('Failed to remove education entry', 'error')
    }
  }

  // ── Skills ──────────────────────────────────────────────────────────────
  const openAddSkill = () => {
    setSkillName('')
    setSkillCategory('other')
    setSkillModalOpen(true)
  }

  const submitSkill = async () => {
    const name = skillName.trim()
    if (!name) return
    setSavingSkill(true)
    try {
      const res = await apiFetch(`${API}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: skillCategory }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to add skill')
      setSkills(s => [...s, data])
      setSkillModalOpen(false)
      notify(`Added "${name}" to your skills`)
    } catch (e: any) {
      notify(e.message || 'Failed to add skill', 'error')
    } finally {
      setSavingSkill(false)
    }
  }

  const removeSkill = async (skill: Skill) => {
    const prev = skills
    setSkills(s => s.filter(x => x.id !== skill.id))
    try {
      const res = await apiFetch(`${API}/skills/${skill.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove skill')
      notify(`Removed "${skill.name}"`)
    } catch {
      setSkills(prev)
      notify('Failed to remove skill', 'error')
    }
  }

  // ── Projects ────────────────────────────────────────────────────────────
  const openAddProject = () => {
    setEditingProjectId(null)
    setProjectForm(emptyProjectForm)
    setProjectModalOpen(true)
  }

  const openEditProject = (p: Project) => {
    setEditingProjectId(p.id)
    setProjectForm({
      name: p.name,
      description: p.description || '',
      stack: p.stack.join(', '),
      github_url: p.github_url || '',
      live_url: p.live_url || '',
      is_live: p.is_live,
    })
    setProjectModalOpen(true)
  }

  const submitProject = async () => {
    const name = projectForm.name.trim()
    if (!name) return
    setSavingProject(true)
    const payload = {
      name,
      description: projectForm.description,
      stack: projectForm.stack.split(',').map(s => s.trim()).filter(Boolean),
      github_url: projectForm.github_url || null,
      live_url: projectForm.live_url || null,
      is_live: projectForm.is_live,
      domains: [],
      highlights: [],
    }
    try {
      const url = editingProjectId ? `${API}/projects/${editingProjectId}` : `${API}/projects`
      const method = editingProjectId ? 'PATCH' : 'POST'
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to save project')

      if (editingProjectId) {
        setProjects(ps => ps.map(p => (p.id === editingProjectId ? { ...p, ...payload, id: p.id, highlights: p.highlights } : p)))
        notify(`Updated "${name}"`)
      } else {
        setProjects(ps => [...ps, { ...payload, id: data.id, highlights: [] }])
        notify(`Added "${name}" to your projects`)
      }
      setProjectModalOpen(false)
    } catch (e: any) {
      notify(e.message || 'Failed to save project', 'error')
    } finally {
      setSavingProject(false)
    }
  }

  const removeProject = async (p: Project) => {
    if (!confirm(`Remove "${p.name}" from your projects?`)) return
    const prev = projects
    setProjects(ps => ps.filter(x => x.id !== p.id))
    try {
      const res = await apiFetch(`${API}/projects/${p.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove project')
      notify(`Removed "${p.name}"`)
    } catch {
      setProjects(prev)
      notify('Failed to remove project', 'error')
    }
  }

  const formatGrad = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-ink-900 tracking-tight">My Profile</h2>
        <p className="text-ink-900/50 mt-1">Your skills and projects used for resume generation</p>
      </div>

      {loadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <span>Failed to connect to JobOS API. Make sure the backend is running on port 8000.</span>
          <button onClick={loadProfile} className="text-red-700 font-semibold hover:underline shrink-0 ml-3">Retry</button>
        </div>
      )}

      {/* Personal Info */}
      <div className="bg-white rounded-2xl border border-ink-900/5 p-6 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-ink-900">Personal Info</h3>
          {!loading && (
            <button onClick={openEditPersonal} className="text-sm text-ink-900 bg-gold-400 hover:bg-gold-500 font-semibold px-3 py-1.5 rounded-full transition-colors">Edit</button>
          )}
        </div>
        {loading ? (
          <SkeletonGrid />
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Name', personal?.name || '—'],
              ['Email', personal?.email || '—'],
              ['Phone', personal?.phone || '—'],
              ['University', personal?.university || '—'],
              ['Degree', personal?.degree || '—'],
              ['Graduation', formatGrad(personal?.graduation_date ?? null)],
              ['Visa', personal?.visa_status || '—'],
              ['LinkedIn', personal?.linkedin_url || '—'],
              ['GitHub', personal?.github_url || '—'],
              ['Portfolio', personal?.portfolio_url || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-ink-900/50">{label}:</span>
                <span className="font-semibold ml-2 text-ink-900">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Education */}
      <div className="bg-white rounded-2xl border border-ink-900/5 p-6 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-ink-900">Education ({education.length})</h3>
          <button onClick={openAddEducation} className="text-sm text-ink-900 bg-gold-400 hover:bg-gold-500 font-semibold px-3 py-1.5 rounded-full transition-colors">+ Add Education</button>
        </div>
        {loading ? (
          <SkeletonRows />
        ) : education.length === 0 ? (
          <p className="text-sm text-ink-900/40">No education yet — add your first one.</p>
        ) : (
          <div className="space-y-3">
            {education.map(e => (
              <div key={e.id} className="flex items-center gap-4 p-4 rounded-2xl border border-ink-900/5 bg-cream-100/40 hover:bg-cream-100/70 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">{e.degree}</p>
                  <p className="text-xs text-ink-900/50 mt-0.5 truncate">{e.school}{e.track ? ` · ${e.track}` : ''}</p>
                </div>
                <button onClick={() => openEditEducation(e)} className="text-xs font-semibold text-ink-900/50 hover:text-ink-900 shrink-0">Edit</button>
                <button onClick={() => removeEducation(e)} className="text-xs font-semibold text-ink-900/50 hover:text-red-600 shrink-0">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="bg-white rounded-2xl border border-ink-900/5 p-6 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-ink-900">Skills ({skills.length})</h3>
          <button onClick={openAddSkill} className="text-sm text-ink-900 bg-gold-400 hover:bg-gold-500 font-semibold px-3 py-1.5 rounded-full transition-colors">+ Add Skill</button>
        </div>
        {loading ? (
          <SkeletonChips />
        ) : skills.length === 0 ? (
          <p className="text-sm text-ink-900/40">No skills yet — add your first one.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map(s => (
              <span key={s.id} className="group flex items-center gap-1.5 pl-3 pr-2 py-1 bg-cream-200 text-ink-900/80 rounded-full text-sm">
                {s.name}
                <button
                  onClick={() => removeSkill(s)}
                  className="text-ink-900/30 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity leading-none"
                  aria-label={`Remove ${s.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="bg-white rounded-2xl border border-ink-900/5 p-6 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-ink-900">Projects ({projects.length})</h3>
          <button onClick={openAddProject} className="text-sm text-ink-900 bg-gold-400 hover:bg-gold-500 font-semibold px-3 py-1.5 rounded-full transition-colors">+ Add Project</button>
        </div>
        {loading ? (
          <SkeletonRows />
        ) : projects.length === 0 ? (
          <p className="text-sm text-ink-900/40">No projects yet — add your first one.</p>
        ) : (
          <div className="space-y-3">
            {projects.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 rounded-2xl border border-ink-900/5 bg-cream-100/40 hover:bg-cream-100/70 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink-900 truncate">{p.name}</p>
                    {p.is_live && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs shrink-0">Live</span>
                    )}
                  </div>
                  <p className="text-xs text-ink-900/50 mt-0.5 truncate">{p.stack.join(' · ') || 'No stack listed'}</p>
                </div>
                <button onClick={() => openEditProject(p)} className="text-xs font-semibold text-ink-900/50 hover:text-ink-900 shrink-0">Edit</button>
                <button onClick={() => removeProject(p)} className="text-xs font-semibold text-ink-900/50 hover:text-red-600 shrink-0">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Preferences */}
      <div className="bg-white rounded-2xl border border-ink-900/5 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-ink-900">Job Preferences</h3>
          {!loading && (
            <button onClick={openEditPreferences} className="text-sm text-ink-900 bg-gold-400 hover:bg-gold-500 font-semibold px-3 py-1.5 rounded-full transition-colors">Edit</button>
          )}
        </div>
        {loading ? (
          <SkeletonGrid />
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Job type', personal?.job_type || '—'],
              ['Remote preference', personal?.remote_preference || '—'],
              ['Target roles', personal?.target_roles?.length ? personal.target_roles.join(', ') : '—'],
              ['Preferred locations', personal?.preferred_locations?.length ? personal.preferred_locations.join(', ') : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-ink-900/50">{label}:</span>
                <span className="font-semibold ml-2 text-ink-900">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
      {skillModalOpen && (
        <Modal title="Add Skill" onClose={() => setSkillModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink-900/70 mb-1">Skill name</label>
              <input
                autoFocus
                type="text"
                value={skillName}
                onChange={e => setSkillName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitSkill()}
                placeholder="e.g. Rust"
                className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900/70 mb-1">Category</label>
              <select
                value={skillCategory}
                onChange={e => setSkillCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                {['language', 'framework', 'database', 'cloud', 'tool', 'ai_ml', 'other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setSkillModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-ink-900/60 hover:bg-cream-200 rounded-full">
                Cancel
              </button>
              <button
                onClick={submitSkill}
                disabled={savingSkill || !skillName.trim()}
                className="px-4 py-2 bg-gold-400 text-ink-900 rounded-full text-sm font-bold hover:bg-gold-500 disabled:opacity-50"
              >
                {savingSkill ? 'Adding...' : 'Add Skill'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add/Edit Project Modal */}
      {projectModalOpen && (
        <Modal title={editingProjectId ? 'Edit Project' : 'Add Project'} onClose={() => setProjectModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink-900/70 mb-1">Name</label>
              <input
                autoFocus
                type="text"
                value={projectForm.name}
                onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Project name"
                className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900/70 mb-1">Description</label>
              <textarea
                value={projectForm.description}
                onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="One-line description"
                className="w-full px-4 py-3 border border-ink-900/10 bg-cream-100/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900/70 mb-1">Stack (comma separated)</label>
              <input
                type="text"
                value={projectForm.stack}
                onChange={e => setProjectForm(f => ({ ...f, stack: e.target.value }))}
                placeholder="React, Node.js, PostgreSQL"
                className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-ink-900/70 mb-1">GitHub URL</label>
                <input
                  type="text"
                  value={projectForm.github_url}
                  onChange={e => setProjectForm(f => ({ ...f, github_url: e.target.value }))}
                  placeholder="github.com/..."
                  className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink-900/70 mb-1">Live URL</label>
                <input
                  type="text"
                  value={projectForm.live_url}
                  onChange={e => setProjectForm(f => ({ ...f, live_url: e.target.value }))}
                  placeholder="myproject.com"
                  className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-900/70">
              <input
                type="checkbox"
                checked={projectForm.is_live}
                onChange={e => setProjectForm(f => ({ ...f, is_live: e.target.checked }))}
                className="rounded border-ink-900/20 text-gold-400 focus:ring-gold-400"
              />
              This project is live
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setProjectModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-ink-900/60 hover:bg-cream-200 rounded-full">
                Cancel
              </button>
              <button
                onClick={submitProject}
                disabled={savingProject || !projectForm.name.trim()}
                className="px-4 py-2 bg-gold-400 text-ink-900 rounded-full text-sm font-bold hover:bg-gold-500 disabled:opacity-50"
              >
                {savingProject ? 'Saving...' : editingProjectId ? 'Save Changes' : 'Add Project'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Personal Info Modal */}
      {personalModalOpen && (
        <Modal title="Edit Personal Info" onClose={() => setPersonalModalOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Name</label>
              <input autoFocus type="text" value={personalForm.name} onChange={e => setPersonalForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="text" value={personalForm.phone} onChange={e => setPersonalForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>University</label>
                <input type="text" value={personalForm.university} onChange={e => setPersonalForm(f => ({ ...f, university: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Degree</label>
                <input type="text" value={personalForm.degree} onChange={e => setPersonalForm(f => ({ ...f, degree: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Graduation date</label>
                <input type="date" value={personalForm.graduation_date} onChange={e => setPersonalForm(f => ({ ...f, graduation_date: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Visa status</label>
                <select value={personalForm.visa_status} onChange={e => setPersonalForm(f => ({ ...f, visa_status: e.target.value }))} className={inputClass}>
                  {['F-1', 'OPT', 'STEM OPT', 'H-1B', 'Green Card', 'Citizen', 'Other'].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>LinkedIn</label>
              <input type="text" value={personalForm.linkedin_url} onChange={e => setPersonalForm(f => ({ ...f, linkedin_url: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>GitHub</label>
              <input type="text" value={personalForm.github_url} onChange={e => setPersonalForm(f => ({ ...f, github_url: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Portfolio</label>
              <input type="text" value={personalForm.portfolio_url} onChange={e => setPersonalForm(f => ({ ...f, portfolio_url: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPersonalModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-ink-900/60 hover:bg-cream-200 rounded-full">
                Cancel
              </button>
              <button
                onClick={submitPersonal}
                disabled={savingPersonal || !personalForm.name.trim()}
                className="px-4 py-2 bg-gold-400 text-ink-900 rounded-full text-sm font-bold hover:bg-gold-500 disabled:opacity-50"
              >
                {savingPersonal ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Job Preferences Modal */}
      {preferencesModalOpen && (
        <Modal title="Edit Job Preferences" onClose={() => setPreferencesModalOpen(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Job type</label>
                <select value={preferencesForm.job_type} onChange={e => setPreferencesForm(f => ({ ...f, job_type: e.target.value }))} className={inputClass}>
                  {['internship', 'co-op', 'full-time', 'either'].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Remote preference</label>
                <select value={preferencesForm.remote_preference} onChange={e => setPreferencesForm(f => ({ ...f, remote_preference: e.target.value }))} className={inputClass}>
                  {['remote', 'hybrid', 'onsite', 'any'].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Target roles</label>
              <input
                type="text"
                value={preferencesForm.target_roles}
                onChange={e => setPreferencesForm(f => ({ ...f, target_roles: e.target.value }))}
                placeholder="e.g. Backend Engineer, SWE, Data Engineer"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Preferred locations</label>
              <input
                type="text"
                value={preferencesForm.preferred_locations}
                onChange={e => setPreferencesForm(f => ({ ...f, preferred_locations: e.target.value }))}
                placeholder="e.g. Dallas TX, Remote, NYC"
                className={inputClass}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPreferencesModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-ink-900/60 hover:bg-cream-200 rounded-full">
                Cancel
              </button>
              <button
                onClick={submitPreferences}
                disabled={savingPreferences}
                className="px-4 py-2 bg-gold-400 text-ink-900 rounded-full text-sm font-bold hover:bg-gold-500 disabled:opacity-50"
              >
                {savingPreferences ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add/Edit Education Modal */}
      {educationModalOpen && (
        <Modal title={editingEducationId ? 'Edit Education' : 'Add Education'} onClose={() => setEducationModalOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Degree</label>
              <input
                autoFocus
                type="text"
                value={educationForm.degree}
                onChange={e => setEducationForm(f => ({ ...f, degree: e.target.value }))}
                placeholder="e.g. M.S. Computer Science"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>School</label>
              <input
                type="text"
                value={educationForm.school}
                onChange={e => setEducationForm(f => ({ ...f, school: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Track / concentration</label>
              <input
                type="text"
                value={educationForm.track}
                onChange={e => setEducationForm(f => ({ ...f, track: e.target.value }))}
                placeholder="Optional"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Relevant coursework</label>
              <textarea
                value={educationForm.relevant_courses}
                onChange={e => setEducationForm(f => ({ ...f, relevant_courses: e.target.value }))}
                rows={2}
                placeholder="Optional"
                className={textareaClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start date</label>
                <input type="date" value={educationForm.start_date} onChange={e => setEducationForm(f => ({ ...f, start_date: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>End date</label>
                <input type="date" value={educationForm.end_date} onChange={e => setEducationForm(f => ({ ...f, end_date: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEducationModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-ink-900/60 hover:bg-cream-200 rounded-full">
                Cancel
              </button>
              <button
                onClick={submitEducation}
                disabled={savingEducation || !educationForm.degree.trim() || !educationForm.school.trim()}
                className="px-4 py-2 bg-gold-400 text-ink-900 rounded-full text-sm font-bold hover:bg-gold-500 disabled:opacity-50"
              >
                {savingEducation ? 'Saving...' : editingEducationId ? 'Save Changes' : 'Add Education'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} kind={toast.kind} onDone={() => setToast(null)} />}
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-4 bg-cream-200 rounded-full animate-pulse" />
      ))}
    </div>
  )
}

function SkeletonChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-7 w-20 bg-cream-200 rounded-full animate-pulse" />
      ))}
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 bg-cream-200 rounded-2xl animate-pulse" />
      ))}
    </div>
  )
}
