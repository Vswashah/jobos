export type Page = 'dashboard' | 'analyze' | 'discover' | 'applications' | 'resumes' | 'interviews' | 'outreach' | 'profile' | 'billing' | 'account'
export type JobStatus = 'found' | 'applied' | 'interviewing' | 'offered' | 'rejected'
export type Navigate = (page: Page, status?: JobStatus) => void

export interface Job {
  id: string
  company: string
  role: string
  location: string | null
  remote_type: string | null
  required_skills: string[]
  status: JobStatus
  found_at: string
  applied_at: string | null
  h1b_sponsor: boolean | null
  f1_eligible: boolean | null
  source_url: string | null
}
