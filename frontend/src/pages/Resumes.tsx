export default function Resumes() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Resumes</h2>
        <p className="text-gray-500 mt-1">All generated resumes</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-5xl mb-3">📄</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No resumes yet</h3>
        <p className="text-gray-500 text-sm">Analyze a JD to generate your first tailored resume</p>
      </div>
    </div>
  )
}
