import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { listProjects, createChatForProject, type Project, type ListProjectsResponse } from "@/api/projects"
import { ProjectCard } from "./ProjectCard"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"

interface ProjectListProps {
  onNewProject: () => void
}

export function ProjectList({ onNewProject }: ProjectListProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter] = useState("active")
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const pageSize = 12

  const fetchProjects = async (reset = false) => {
    try {
      if (reset) {
        setPage(0)
        setProjects([])
      }
      
      setLoading(true)
      setError(null)
      
      const currentPage = reset ? 0 : page
      const response: ListProjectsResponse = await listProjects(
        statusFilter, // fixed to 'active' (filter UI removed)
        pageSize,
        currentPage * pageSize,
        'updated_at',
        'desc'
      )
      
      if (reset) {
        setProjects(response.projects || [])
      } else {
        setProjects(prev => [...(prev || []), ...(response.projects || [])])
      }
      
      setHasMore((response.projects || []).length === pageSize)
      if (!reset) {
        setPage(prev => prev + 1)
      }
    } catch (err) {
      console.error('Fetch projects error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load projects')
      setProjects([]) // Ensure projects is always an array
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchProjects(true)
    }
   }, [user])

  const filteredProjects = (projects || []).filter(project =>
    (project?.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project?.initial_idea || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleProjectClick = async (project: Project) => {
    try {
      setLoading(true)
      
      if (project.source_chat_id) {
        // Navigate directly to existing workspace
        navigate(`/workspace/${project.id}/${project.source_chat_id}`)
      } else {
        // Create a new chat for this project and navigate
        const response = await createChatForProject(project.id)
        if (response.id) {
          navigate(`/workspace/${project.id}/${response.id}`)
        } else {
          throw new Error('Failed to create chat for project')
        }
      }
    } catch (err) {
      console.error('Failed to open project:', err)
      setError(err instanceof Error ? err.message : 'Failed to open project')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your projects...</span>
        </div>
      </div>
    )
  }

  if (error && projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => fetchProjects(true)} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Your Projects</h2>
          <p className="text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNewProject} className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'No projects match your search.' : 'No projects yet.'}
          </p>
          {!searchTerm && (
            <Button onClick={onNewProject} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create your first project
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className={`grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3`}>
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project)}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && !searchTerm && (
            <div className="text-center">
              <Button
                onClick={() => fetchProjects(false)}
                variant="outline"
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
