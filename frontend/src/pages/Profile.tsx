import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { API_BASE } from '../config'

const API = `${API_BASE}/api/profile`

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
  university: string
  degree: string
  graduation_date: string | null
  visa_status: string
}

const emptyProjectForm = {
  name: '', description: '', stack: '', github_url: '', live_url: '', is_live: false,
}

export default function Profile() {
  const [personal, setPersonal] = useState<Personal | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [projects, setProjects] = useState<Project[]>([])
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

  const loadProfile = () => {
    setLoading(true)
    setLoadError(false)
    fetch(`${API}/`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load profile')
        return r.json()
      })
      .then(data => {
        setPersonal(data.personal)
        setSkills(data.skills || [])
        setProjects(data.projects || [])
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(loadProfile, [])

  const notify = (message: string, kind: 'success' | 'error' = 'success') => setToast({ message, kind })

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
      const res = await fetch(`${API}/skills`, {
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
      const res = await fetch(`${API}/skills/${skill.id}`, { method: 'DELETE' })
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
      const res = await fetch(url, {
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
      const res = await fetch(`${API}/projects/${p.id}`, { method: 'DELETE' })
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
        <h3 className="text-lg font-bold text-ink-900 mb-4">Personal Info</h3>
        {loading ? (
          <SkeletonGrid />
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Name', personal?.name || '—'],
              ['Email', personal?.email || '—'],
              ['University', personal?.university || '—'],
              ['Degree', personal?.degree || '—'],
              ['Graduation', formatGrad(personal?.graduation_date ?? null)],
              ['Visa', personal?.visa_status ? `${personal.visa_status} (CPT Eligible)` : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-ink-900/50">{label}:</span>
                <span className="font-semibold ml-2 text-ink-900">{value}</span>
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
      <div className="bg-white rounded-2xl border border-ink-900/5 p-6 shadow-sm">
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
