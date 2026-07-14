const skills = [
  "Python", "JavaScript", "TypeScript", "React", "Node.js",
  "FastAPI", "Flask", "PostgreSQL", "MySQL", "Redis",
  "Docker", "Kubernetes", "AWS", "GitHub Actions", "Go",
  "LangChain", "LangGraph", "LiteLLM", "Kafka", "Prometheus",
]

const projects = [
  { name: "Fleet Telemetry Pipeline", stack: ["Python", "Kafka", "Redis", "AWS"], live: false },
  { name: "Trackly", stack: ["React", "Node.js", "PostgreSQL", "LangChain"], live: true },
  { name: "Phantom", stack: ["Python", "LangGraph", "LiteLLM", "FastAPI"], live: false },
  { name: "AEGIS Platform", stack: ["Python", "React", "FastAPI"], live: false },
]

export default function Profile() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        <p className="text-gray-500 mt-1">Your skills and projects used for resume generation</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Info</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Name', 'Vishwaa Shah'],
            ['Email', 'vishwaa.career@gmail.com'],
            ['University', 'UT Dallas'],
            ['Degree', 'M.S. Computer Science'],
            ['Graduation', 'May 2027'],
            ['Visa', 'F-1 (CPT Eligible)'],
          ].map(([label, value]) => (
            <div key={label}>
              <span className="text-gray-500">{label}:</span>
              <span className="font-medium ml-2">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Skills ({skills.length})</h3>
          <button className="text-sm text-blue-600 hover:underline">+ Add Skill</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.map(s => (
            <span key={s} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{s}</span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Projects ({projects.length})</h3>
          <button className="text-sm text-blue-600 hover:underline">+ Add Project</button>
        </div>
        <div className="space-y-3">
          {projects.map(p => (
            <div key={p.name} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  {p.live && (
                    <span className="px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs">Live</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{p.stack.join(' · ')}</p>
              </div>
              <button className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
