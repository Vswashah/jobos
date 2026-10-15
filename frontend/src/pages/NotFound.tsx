import Mascot from '../components/Mascot'
import { Button } from '../components/ui'

export default function NotFound() {
  return (
    <div className="p-8 flex flex-col items-center text-center gap-3 max-w-md mx-auto mt-16">
      <Mascot size={140} mood="oops" />
      <h2 className="text-2xl font-bold tracking-tight">Page not found</h2>
      <p className="text-muted text-sm">Rex looked everywhere, but there's nothing at <span className="font-mono">{window.location.pathname}</span>.</p>
      <Button variant="primary" onClick={() => window.location.assign('/')}>Back to the dashboard</Button>
    </div>
  )
}
