import { Search, FileText, Send, Mic, Zap, Compass, Flame, CalendarClock, ArrowRight } from 'lucide-react'
import { useFetch } from '../api'
import Mascot from '../components/Mascot'
import ActivityTrendChart from '../components/ActivityTrendChart'
import { Button, Card, CardHeader, EmptyState, ErrorState, Skeleton } from '../components/ui'
import type { Job, JobStatus, Navigate } from '../types'

interface Activity { action: string; entity_type: string; metadata: any; created_at: string }
interface Streak { current_streak: number; longest_streak: number; active_today: boolean; grid: { date: string; count: number }[] }
interface Interview { id: string; company: string; role: string; round: number; interview_date: string | null }

const FOLLOW_UP_AFTER_DAYS = 7
const DAY_MS = 86_400_000

const dot = (n: number) => (n === 0 ? 'bg-stone' : n <= 2 ? 'bg-accent/40' : n <= 5 ? 'bg-accent/70' : 'bg-accent')
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

const describe = (a: Activity) => {
  const who = a.metadata?.company
  if (a.action === 'job_analyzed') return `Analyzed ${who || 'a job'}${a.metadata?.role ? ` — ${a.metadata.role}` : ''}`
  if (a.action === 'resume_generated') return `Generated resume for ${who || 'a company'}`
  return a.action.replace(/_/g, ' ')
}

export default function Dashboard({ userName, navigate }: { userName: string; navigate: Navigate }) {
  const jobsQ = useFetch<{ jobs: Job[] }>('/api/jobs/')
  const analytics = useFetch<{ stats: { resumes_generated: number }; recent_activity: Activity[] }>('/api/jobs/analytics')
  const streakQ = useFetch<Streak>('/api/jobs/streak')
  const skillsQ = useFetch<{ skills: { skill: string; count: number }[] }>('/api/jobs/top-skills')
  const mySkillsQ = useFetch<{ skills: { name: string }[] }>('/api/profile/skills')
  const interviewsQ = useFetch<{ interviews: Interview[] }>('/api/interviews/')

  const jobs = jobsQ.data?.jobs
  const count = (s: JobStatus) => jobs?.filter(j => j.status === s).length ?? 0
  const submitted = jobs?.filter(j => j.applied_at).length ?? 0
  const advanced = jobs?.filter(j => j.applied_at && (j.status === 'interviewing' || j.status === 'offered')).length ?? 0
  const quietWeek = !jobs?.some(j => j.applied_at && Date.now() - new Date(j.applied_at).getTime() < 7 * DAY_MS)
  const conversion = submitted ? Math.round((advanced / submitted) * 100) : null

  const kpis = [
    { label: 'JDs Analyzed', value: jobs?.length, icon: Search },
    { label: 'Resumes Generated', value: analytics.data?.stats.resumes_generated, icon: FileText },
    { label: 'Applications Submitted', value: jobs ? submitted : undefined, icon: Send },
    { label: 'Interviews', value: interviewsQ.data?.interviews.length, icon: Mic },
  ]

  // Next actions — only what the data can honestly say: scheduled interviews,
  // and applications that have sat in "applied" past the follow-up window.
  const now = Date.now()
  const actions = [
    ...(interviewsQ.data?.interviews ?? [])
      .filter(i => i.interview_date && new Date(i.interview_date).getTime() >= now)
      .map(i => ({
        key: `i${i.id}`, when: new Date(i.interview_date!).getTime(), icon: Mic,
        title: `${i.company} — round ${i.round}`, detail: fmtDateTime(i.interview_date!),
        cta: 'Prepare', go: () => navigate('interviews'),
      })),
    ...(jobs ?? [])
      .filter(j => j.status === 'applied' && j.applied_at && now - new Date(j.applied_at).getTime() > FOLLOW_UP_AFTER_DAYS * DAY_MS)
      .map(j => ({
        key: `j${j.id}`, when: new Date(j.applied_at!).getTime() + FOLLOW_UP_AFTER_DAYS * DAY_MS, icon: CalendarClock,
        title: `${j.company} — ${j.role}`, detail: `Applied ${fmtDate(j.applied_at!)}, no update yet`,
        cta: 'Review', go: () => navigate('applications', 'applied'),
      })),
  ].sort((a, b) => a.when - b.when).slice(0, 5)
  const actionsLoading = jobsQ.loading || interviewsQ.loading

  const mine = new Set(mySkillsQ.data?.skills.map(s => s.name.toLowerCase()))
  const topSkills = skillsQ.data?.skills ?? []
  const maxSkill = Math.max(...topSkills.map(s => s.count), 1)
  const streak = streakQ.data
  const weeks = streak ? Array.from({ length: Math.ceil(streak.grid.length / 7) }, (_, i) => streak.grid.slice(i * 7, i * 7 + 7)) : []
  const trend = streak?.grid.slice(-30) ?? []

  const pipeline: { label: string; status: JobStatus }[] = [
    { label: 'Applied', status: 'applied' }, { label: 'Interviewing', status: 'interviewing' },
    { label: 'Offered', status: 'offered' }, { label: 'Rejected', status: 'rejected' },
  ]
  const pipeTotal = pipeline.reduce((n, p) => n + count(p.status), 0)

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <Mascot size={72} mood="wave" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back, {userName.split(' ')[0]}</h2>
            <p className="text-muted mt-1">Here's where your job search stands.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => navigate('analyze')}><Zap className="size-4" />Analyze a JD</Button>
          <Button onClick={() => navigate('discover')}><Compass className="size-4" />Discover jobs</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="!p-4 md:!p-5">
            <Icon className="size-5 text-accent mb-3" aria-hidden />
            {value === undefined ? <Skeleton className="h-8 w-12" /> : <div className="text-3xl font-bold">{value}</div>}
            <div className="text-sm text-muted mt-1">{label}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader title="Next actions" subtitle="Upcoming interviews and applications waiting on a reply" />
          {actionsLoading ? <Skeleton className="h-32" /> : interviewsQ.error && jobsQ.error ? (
            <ErrorState what="actions" onRetry={() => { jobsQ.reload(); interviewsQ.reload() }} />
          ) : actions.length === 0 ? (
            <EmptyState mood="sleep" title="Nothing pending" hint="Scheduled interviews and stale applications will show up here." />
          ) : (
            <ul className="divide-y divide-line">
              {actions.map(a => (
                <li key={a.key} className="flex items-center gap-3 py-3">
                  <a.icon className="size-5 text-accent shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{a.title}</p>
                    <p className="text-xs text-muted">{a.detail}</p>
                  </div>
                  <Button variant="ghost" onClick={a.go}>{a.cta}<ArrowRight className="size-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Pipeline" subtitle={conversion === null ? 'Applied → interview conversion appears after your first application' : `${conversion}% of applications reached an interview`} />
          {jobsQ.loading ? <Skeleton className="h-32" /> : jobsQ.error ? <ErrorState what="pipeline" onRetry={jobsQ.reload} /> : (
            <ul className="space-y-1">
              {pipeline.map(p => (
                <li key={p.status}>
                  <button onClick={() => navigate('applications', p.status)} className="w-full text-left rounded-xl p-2 hover:bg-stone">
                    <div className="flex justify-between text-sm"><span className="font-semibold">{p.label}</span><span>{count(p.status)}</span></div>
                    <div className="h-2 mt-1.5 rounded-full bg-stone" aria-hidden>
                      <div className="h-2 rounded-full bg-accent" style={{ width: pipeTotal ? `${(count(p.status) / pipeTotal) * 100}%` : 0 }} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {jobs && submitted > 0 && quietWeek && (
            <p className="flex items-center gap-2 mt-3 pt-3 border-t border-line text-sm text-muted">
              <Mascot size={44} mood="sleep" />No applications sent this week.
            </p>
          )}
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-white border border-line rounded-xl p-5 md:p-6">
          <h3 className="text-base font-semibold">Activity streak</h3>
          <p className="text-xs text-muted mt-0.5 mb-4">Last 12 weeks — each square is a day with logged activity</p>
          {streakQ.loading ? <Skeleton className="h-28 bg-stone" /> : streakQ.error || !streak ? <ErrorState what="streak" onRetry={streakQ.reload} /> : (
            <>
              <div className="flex items-center gap-6 mb-4">
                {streak.current_streak >= 3 && (
                  <div className="flex items-center gap-2">
                    <Mascot size={64} mood="fire" />
                    <p className="text-sm font-semibold max-w-24 leading-tight">{streak.current_streak} days in a row!</p>
                  </div>
                )}
                <div><div className="text-3xl font-bold text-accent flex items-center gap-1">{streak.current_streak}<Flame className="size-5" aria-hidden /></div><div className="text-xs text-muted">current</div></div>
                <div><div className="text-3xl font-bold">{streak.longest_streak}</div><div className="text-xs text-muted">longest</div></div>
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1" role="img" aria-label={`Activity grid: current streak ${streak.current_streak} days, longest ${streak.longest_streak}`}>
                {weeks.map((w, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    {w.map(d => <div key={d.date} title={`${d.date}: ${d.count} action${d.count === 1 ? '' : 's'}`} className={`size-3 rounded-[3px] ${dot(d.count)}`} />)}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted">
                Less {[0, 1, 3, 6].map(n => <span key={n} className={`size-3 rounded-[3px] ${dot(n)}`} />)} More
              </div>
            </>
          )}
        </section>

        <section className="bg-white border border-line rounded-xl p-5 md:p-6">
          <h3 className="text-base font-semibold">30-day trend</h3>
          <p className="text-xs text-muted mt-0.5 mb-4">Logged actions per day</p>
          {streakQ.loading ? <Skeleton className="h-28 bg-stone" /> : streakQ.error ? <ErrorState what="trend" onRetry={streakQ.reload} /> :
            trend.every(d => d.count === 0) ? <p className="text-sm text-muted py-8 text-center">No activity in the last 30 days.</p> : <ActivityTrendChart data={trend} />}
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Skills in your analyzed JDs" subtitle="Filled = on your profile · outlined = not on your profile"
            action={<Button variant="ghost" onClick={() => navigate('profile')}>Update skills</Button>} />
          {skillsQ.loading ? <Skeleton className="h-40" /> : skillsQ.error ? <ErrorState what="skills" onRetry={skillsQ.reload} /> :
            topSkills.length === 0 ? <EmptyState title="No skills yet" hint="Analyze a job description to see which skills employers ask for." /> : (
              <ul className="space-y-2.5">
                {topSkills.map(s => {
                  const has = mine.has(s.skill.toLowerCase())
                  return (
                    <li key={s.skill} className="flex items-center gap-3 text-sm">
                      <span className="w-28 truncate capitalize">{s.skill}</span>
                      <div className="flex-1 h-3 rounded-full bg-stone" aria-hidden>
                        <div className={`h-3 rounded-full ${has ? 'bg-accent' : 'bg-white border-2 border-accent'}`} style={{ width: `${(s.count / maxSkill) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right font-bold">{s.count}</span>
                      <span className="sr-only">{has ? 'on your profile' : 'missing from your profile'}</span>
                    </li>
                  )
                })}
              </ul>
            )}
        </Card>

        <Card>
          <CardHeader title="Recent activity" />
          {analytics.loading ? <Skeleton className="h-40" /> : analytics.error ? <ErrorState what="activity" onRetry={analytics.reload} /> :
            !analytics.data?.recent_activity.length ? <EmptyState title="No activity yet" hint="Analyze your first JD to get started." action={<Button variant="primary" onClick={() => navigate('analyze')}>Analyze a JD</Button>} /> : (
              <ul className="divide-y divide-line">
                {analytics.data.recent_activity.map((a, i) => (
                  <li key={i} className="flex items-center gap-3 py-2.5">
                    {a.action === 'job_analyzed' ? <Search className="size-4 text-accent shrink-0" aria-hidden /> : <FileText className="size-4 text-accent shrink-0" aria-hidden />}
                    <p className="text-sm flex-1 min-w-0 truncate">{describe(a)}</p>
                    <time className="text-xs text-muted shrink-0" dateTime={a.created_at}>{fmtDateTime(a.created_at)}</time>
                  </li>
                ))}
              </ul>
            )}
        </Card>
      </div>
    </div>
  )
}
