import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = { embedded?: boolean }

export default function SchemaView({ embedded }: Props) {
  const mockSchema = `# API Schema

## Endpoints

### Tasks API

#### GET /tasks
- **Description**: Retrieve all tasks
- **Response**: Array of task objects
- **Status**: 200 OK

#### POST /tasks
- **Description**: Create a new task
- **Request Body**: Task object
- **Response**: Created task object
- **Status**: 201 Created

#### PUT /tasks/:id
- **Description**: Update a task
- **Parameters**: Task ID
- **Request Body**: Updated task object
- **Response**: Updated task object
- **Status**: 200 OK

#### DELETE /tasks/:id
- **Description**: Delete a task
- **Parameters**: Task ID
- **Response**: Empty
- **Status**: 204 No Content

## Data Models

### Task Object
\`\`\`json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "priority": "high|medium|low",
  "status": "pending|in_progress|completed",
  "due_date": "ISO 8601 date string",
  "created_at": "ISO 8601 date string",
  "updated_at": "ISO 8601 date string"
}
\`\`\``

  const body = (
    <div className="p-4 flex-1 min-h-0 overflow-auto">
      <div className="prose dark:prose-invert max-w-3xl mx-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{mockSchema}</ReactMarkdown>
      </div>
    </div>
  )

  if (embedded) return body

  return (
    <div className="h-screen overflow-hidden flex w-full ambient-spotlight">
      <main className="flex-1 min-h-0 flex flex-col">
        <div className="h-12 border-b flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-medium">Schema</span>
          </div>
        </div>
        {body}
      </main>
    </div>
  )
}


