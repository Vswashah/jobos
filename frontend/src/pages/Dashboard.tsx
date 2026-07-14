export default function Dashboard() {
  const stats = [
    { label: 'Resumes Generated', value: '0', icon: '📄' },
    { label: 'Jobs Analyzed', value: '0', icon: '🔍' },
    { label: 'Avg Skill Match', value: '—', icon: '⚡' },
    { label: 'Applications Sent', value: '0', icon: '📨' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, Vishwaa 👋</h2>
        <p className="text-gray-500 mt-1">Your AI-powered job search dashboard</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: '⚡', label: 'Analyze New JD' },
            { icon: '📄', label: 'View Resumes' },
            { icon: '👤', label: 'Update Profile' },
          ].map(a => (
            <button key={a.label} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <span className="text-2xl">{a.icon}</span>
              <span className="text-sm font-medium text-gray-700">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">🚀</div>
          <p className="text-sm">No activity yet — analyze your first JD to get started</p>
        </div>
      </div>
    </div>
  )
}
