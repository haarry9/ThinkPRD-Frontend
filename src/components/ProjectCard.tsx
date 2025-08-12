import { Card, CardContent } from "@/components/ui/card"
// Removed status badge per request
import { formatDistanceToNow } from "date-fns"
import { Clock, FileText, BarChart3 } from "lucide-react"
import type { Project } from "@/api/projects"

interface ProjectCardProps {
  project: Project
  onClick: () => void
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const thinkingLensStatus = project.metadata?.thinking_lens_status || {
    discovery: false,
    user_journey: false,
    metrics: false,
    gtm: false,
    risks: false
  }
  
  const completedLenses = Object.values(thinkingLensStatus).filter(Boolean).length
  const totalLenses = Object.keys(thinkingLensStatus).length
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'archived': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'deleted': return 'bg-red-500/10 text-red-500 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  return (
    <Card 
      className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 border-border/50 hover:border-primary/20 bg-card/60 backdrop-blur-sm"
      onClick={onClick}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-foreground truncate group-hover:text-primary transition-colors">
              {project.project_name || 'Untitled Project'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {project.initial_idea || 'No description available'}
            </p>
          </div>
          {/* status badge removed */}
        </div>

        {/* Progress indicators */}
        <div className="space-y-3 mb-4">
          {/* Thinking lenses progress */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            <span>Thinking Lenses: {completedLenses}/{totalLenses}</span>
            <div className="flex-1 bg-muted rounded-full h-1.5 ml-2">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${(completedLenses / totalLenses) * 100}%` }}
              />
            </div>
          </div>

          {/* File count and iterations */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{project.metadata?.file_count || 0} files</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                {project.metadata?.total_iterations || 0} iterations
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Updated {project.updated_at ? formatDistanceToNow(new Date(project.updated_at), { addSuffix: true }) : 'Unknown'}</span>
          </div>
          <div className="text-xs font-mono">
            {project.current_version || 'v1.0'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
