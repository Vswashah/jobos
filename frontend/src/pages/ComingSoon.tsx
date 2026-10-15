import { Card } from '../components/ui'

export default function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <Card className="mt-5">
        <p className="text-sm font-semibold">Not available yet</p>
        <p className="text-sm text-muted mt-1">{description}</p>
      </Card>
    </div>
  )
}
