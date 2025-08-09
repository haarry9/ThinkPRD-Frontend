---
alwaysApply: true
---
# AI PRD Generator - Backend Technical Requirements Document

## 1. Framework & Technology Stack

### Core Framework
- **FastAPI**: Primary web framework for REST API development
  - Version: 0.104.0 or latest stable
  - Async support for concurrent request handling
  - Automatic API documentation generation
  - Built-in data validation with Pydantic

### Agent Framework
- **LangGraph**: AI agent orchestration and workflow management
  - Version: 0.0.62 or latest stable
  - Multi-agent coordination
  - State persistence and checkpointing
  - Conditional edge routing

### Python Version
- **Python 3.11+**: Required for optimal async performance and type hints

### Core Dependencies
```python
fastapi
langraph
uvicorn
pydantic
pymongo
redis
boto3
python-multipart
python-jose[cryptography]
passlib[bcrypt]
websockets
celery
aiofiles  
python-socketio 
tiktoken  
```

## 2. Database Architecture

### Primary Database: MongoDB
- **Purpose**: User management, project metadata, session data, agent state
- **Version**: MongoDB 7.0+
- **Driver**: PyMongo 4.6.0+
- **Connection**: MongoDB Atlas or self-hosted

### Object Storage: Amazon S3
- **Purpose**: PRD documents, flowchart files, user uploads
- **Bucket Structure**:
  ```
  /{environment}/
    ├── projects/{user_id}/{project_id}/
    │   ├── versions/{timestamp}/
    │   │   ├── prd.md
    │   │   ├── flowchart.mmd
    │   │   └── metadata.json
    │   ├── current/
    │   │   ├── prd.md
    │   │   └── flowchart.mmd
    │   └── uploads/{file_hash}.{ext}
  ```

### Caching: Redis
- **Purpose**: Session management, AI response caching, agent state caching
- **Version**: Redis 7.0+
- **Driver**: redis-py 5.0.1+
- **Use Cases**:
  - JWT token blacklisting
  - AI model response caching (24h TTL)
  - WebSocket connection management
  - Agent execution state temporary storage

## 3. Authentication & Authorization

### Authentication Strategy
- **Method**: JWT (JSON Web Tokens)
- **Implementation**: python-jose with cryptography
- **Token Types**:
  - **Access Token**: 30-minute expiry
  - **Refresh Token**: 7-day expiry, stored in Redis

### Registration Flow
```python
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "secure_password",
  "full_name": "User Name"
}
```

### Login Flow
```python
POST /api/v1/auth/login
{
  "email": "user@example.com", 
  "password": "secure_password"
}

Response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Password Security
- **Hashing**: bcrypt with salt rounds = 12
- **Validation**: Minimum 8 characters, mixed case, numbers
- **Storage**: Hashed passwords only in MongoDB

### Authorization Middleware
- **JWT Validation**: On all protected endpoints
- **User Context**: Extracted from token payload
- **Rate Limiting**: Per-user request limiting (not MVP)

## 4. Third-Party Integrations

### AI/LLM Providers

#### Primary: OpenAI GPT-4
```python
# Configuration
OPENAI_API_KEY = "sk-..."
OPENAI_MODEL_PRIMARY = "gpt-4-1106-preview"
OPENAI_MODEL_FALLBACK = "gpt-3.5-turbo-1106"
OPENAI_MAX_TOKENS = 4096
OPENAI_TEMPERATURE = 0.7
```

#### Secondary: Anthropic Claude
```python
# Fallback configuration
ANTHROPIC_API_KEY = "sk-ant-..."
ANTHROPIC_MODEL = "claude-3-sonnet-20240229"
ANTHROPIC_MAX_TOKENS = 4096
```

#### Fallback Strategy
1. Primary: OpenAI GPT-4
2. Secondary: OpenAI GPT-3.5-turbo
3. Tertiary: Anthropic Claude
4. Error: Return cached response or graceful degradation

### File Storage: AWS S3
```python
# S3 Configuration
AWS_ACCESS_KEY_ID = "AKIA..."
AWS_SECRET_ACCESS_KEY = "..."
AWS_REGION = "us-east-1"
S3_BUCKET_NAME = "ai-prd-generator-{environment}"
S3_PRESIGNED_URL_EXPIRY = 3600  # 1 hour
```

### Task Queue: Celery + Redis
```python
# Celery Configuration
CELERY_BROKER_URL = "redis://localhost:6379/0"
CELERY_RESULT_BACKEND = "redis://localhost:6379/0"
CELERY_TASK_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_RESULT_SERIALIZER = "json"
```

## 5. Database Schema Design

### MongoDB Collections

#### Users Collection
```javascript
{
  "_id": ObjectId,
  "email": "user@example.com",
  "password_hash": "$2b$12$...",
  "full_name": "User Name",
  "created_at": ISODate,
  "updated_at": ISODate,
  "is_active": true,
  "last_login": ISODate
}

// Indexes
db.users.createIndex({"email": 1}, {unique: true})
db.users.createIndex({"created_at": 1})
```

#### Projects Collection
```javascript
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "project_name": "My Product Idea",
  "initial_idea": "A platform for...",
  "status": "active", // active, archived, deleted
  "source_chat_id": ObjectId, // Reference to originating chat
  "created_from_chat": true,
  "current_version": "v1.2",
  "created_at": ISODate,
  "updated_at": ISODate,
  "s3_path": "projects/{user_id}/{project_id}/",
  "metadata": {
    "thinking_lens_status": {
      "discovery": true,
      "user_journey": true, 
      "metrics": false,
      "gtm": true,
      "risks": false
    },
    "last_agent_run": ISODate,
    "total_iterations": 15
  }
}

// Indexes
db.projects.createIndex({"user_id": 1, "status": 1})
db.projects.createIndex({"created_at": -1})
db.projects.createIndex({"user_id": 1, "updated_at": -1})
db.projects.createIndex({"source_chat_id": 1})
```

#### Sessions Collection
```javascript
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "project_id": ObjectId,
  "session_id": "uuid4",
  "websocket_id": "connection_id",
  "agent_state": {
    "current_step": "prd_generation",
    "conversation_history": [...],
    "intermediate_outputs": {...},
    "execution_context": {...}
  },
  "created_at": ISODate,
  "last_activity": ISODate,
  "expires_at": ISODate
}

// Indexes
db.sessions.createIndex({"session_id": 1}, {unique: true})
db.sessions.createIndex({"user_id": 1, "project_id": 1})
db.sessions.createIndex({"expires_at": 1}, {expireAfterSeconds: 0})
```

#### Uploads Collection
```javascript
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "project_id": ObjectId,
  "filename": "document.pdf",
  "original_filename": "Product Requirements.pdf",
  "file_size": 2048576,
  "content_type": "application/pdf",
  "s3_key": "projects/{user_id}/{project_id}/uploads/{hash}.pdf",
  "file_hash": "sha256_hash",
  "uploaded_at": ISODate
}

// Indexes
db.uploads.createIndex({"user_id": 1, "project_id": 1})
db.uploads.createIndex({"file_hash": 1})
```

#### Agent_Logs Collection
```javascript
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "project_id": ObjectId,
  "session_id": "uuid4",
  "agent_type": "clarification_agent",
  "execution_id": "uuid4",
  "input_data": {...},
  "output_data": {...},
  "execution_time_ms": 2500,
  "status": "success", // success, error, timeout
  "error_details": null,
  "timestamp": ISODate
}

// Indexes
db.agent_logs.createIndex({"user_id": 1, "timestamp": -1})
db.agent_logs.createIndex({"execution_id": 1})
db.agent_logs.createIndex({"timestamp": -1})
```

#### Chats Collection
```js
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "chat_name": "My Product Chat #1",
  "created_at": ISODate,
  "updated_at": ISODate,
  "last_message_at": ISODate,
  "status": "active", // active, archived, deleted
  "metadata": {
    "message_count": 25,
    "has_project": false,
    "project_id": null // ObjectId when chat leads to project creation
  }
}

// Indexes
db.chats.createIndex({"user_id": 1, "status": 1})
db.chats.createIndex({"user_id": 1, "updated_at": -1})
db.chats.createIndex({"last_message_at": -1})
```

#### Messages Collection  
```js
{
  "_id": ObjectId,
  "chat_id": ObjectId,
  "user_id": ObjectId,
  "message_type": "user", // user, assistant, system
  "content": "Can you help me create a PRD for...",
  "timestamp": ISODate,
  "metadata": {
    "tokens_used": 150,
    "response_time_ms": 2500,
    "model_used": "gpt-4-1106-preview",
    "context_length": 1200
  },
  "attachments": [
    {
      "file_id": ObjectId,
      "filename": "requirements.pdf",
      "s3_key": "chats/{chat_id}/attachments/{file_hash}.pdf"
    }
  ]
}

// Indexes
db.messages.createIndex({"chat_id": 1, "timestamp": 1})
db.messages.createIndex({"user_id": 1, "timestamp": -1})
db.messages.createIndex({"timestamp": -1})
```

### Redis Schema Design

#### Session Management
```python
# Key patterns
user_session:{user_id} -> {session_data}
websocket_connection:{connection_id} -> {user_id}
jwt_blacklist:{token_jti} -> {expiry_timestamp}

# TTL
user_session: 30 minutes
websocket_connection: 24 hours  
jwt_blacklist: token expiry time
```

#### AI Response Caching
```python
# Key patterns
ai_cache:{hash_of_prompt} -> {response_json}
agent_state:{session_id} -> {langraph_state}

# TTL
ai_cache: 24 hours
agent_state: 2 hours
```

#### Chat Management
```python
# Key patterns
chat_session:{chat_id} -> {chat_metadata}
chat_context:{chat_id} -> {conversation_context}
active_chats:{user_id} -> {set_of_chat_ids}
chat_typing:{chat_id} -> {typing_status}

# TTL
chat_session: 24 hours
chat_context: 2 hours (sliding window)
active_chats: 30 minutes
chat_typing: 30 seconds
```

## 6. API Design & Documentation

### API Versioning Strategy
- **URL Versioning**: `/api/v1/`
- **Header Support**: `API-Version: v1`
- **Deprecation**: 6-month notice period

### Authentication Endpoints

#### POST /api/v1/auth/register
```python
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}

Response (201):
{
  "message": "User registered successfully",
  "user_id": "64f5a1b2c3d4e5f6789012ab"
}

Response (400):
{
  "error": "Email already exists"
}
```

#### POST /api/v1/auth/login
```python
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "64f5a1b2c3d4e5f6789012ab",
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

#### POST /api/v1/auth/refresh
```python
Request:
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

Response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 1800
}
```

#### POST /api/v1/auth/logout
```python
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "message": "Successfully logged out"
}
```

#### POST /api/v1/auth/change-password
```python
Headers: Authorization: Bearer {access_token}

Request:
{
  "current_password": "oldPassw0rd",
  "new_password": "N3wSecur3Pass!"
}

Response (200):
{
  "message": "Password updated successfully"
}

Response (400):
{
  "error": "Current password is incorrect"
}
```

### User Profile Endpoints

#### GET /api/v1/users/me
```python
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "id": "64f5a1b2c3d4e5f6789012ab",
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T14:25:00Z"
}
```

#### PUT /api/v1/users/me
```python
Headers: Authorization: Bearer {access_token}

Request:
{
  "full_name": "John Q. Doe"
}

Response (200):
{
  "message": "Profile updated successfully",
  "user": {
    "id": "64f5a1b2c3d4e5f6789012ab",
    "email": "user@example.com",
    "full_name": "John Q. Doe",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-16T15:10:00Z"
  }
}
```

#### GET /api/v1/users/{user_id}
```python
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "id": "64f5a1b2c3d4e5f6789012ac",
  "email": "other@example.com",
  "full_name": "Other User",
  "is_active": true,
  "created_at": "2024-01-10T09:00:00Z",
  "updated_at": "2024-01-12T11:00:00Z"
}

Response (404):
{
  "error": "User not found"
}
```

### Project Management Endpoints

#### GET /api/v1/projects
```python
Headers: Authorization: Bearer {access_token}
Query Parameters:
- status: active|archived|deleted (default: active)
- limit: int (default: 20)
- offset: int (default: 0)

Response (200):
{
  "projects": [
    {
      "id": "64f5a1b2c3d4e5f6789012ab",
      "project_name": "Mobile App PRD",
      "initial_idea": "A fitness tracking app...",
      "status": "active",
      "current_version": "v1.3",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-16T14:25:00Z",
      "thinking_lens_status": {
        "discovery": true,
        "user_journey": true,
        "metrics": false,
        "gtm": true, 
        "risks": false
      }
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

#### POST /api/v1/projects
```python
Headers: Authorization: Bearer {access_token}
Content-Type: multipart/form-data

Request:
{
  "initial_idea": "A platform for connecting freelancers",
  "files": [File1, File2] // Optional uploads
}

Response (201):
{
  "project_id": "64f5a1b2c3d4e5f6789012ab",
  "session_id": "uuid4-session-id",
  "clarification_questions": [
    {
      "lens": "discovery",
      "question": "Who is your primary target user?",
      "context": "Understanding your core audience helps define key features"
    }
  ]
}
```

#### GET /api/v1/projects/{project_id}
```python
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "project": {
    "id": "64f5a1b2c3d4e5f6789012ab",
    "project_name": "Mobile App PRD", 
    "initial_idea": "A fitness tracking app...",
    "status": "active",
    "current_version": "v1.3",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-16T14:25:00Z",
    "prd_content": "# Product Requirements Document...",
    "flowchart_content": "graph TD\n A[User] --> B[Frontend]...",
    "thinking_lens_status": {...},
    "version_history": [
      {
        "version": "v1.3",
        "timestamp": "2024-01-16T14:25:00Z",
        "changes": "Added metrics section"
      }
    ]
  }
}
```

### Agent Interaction Endpoints

#### POST /api/v1/projects/{project_id}/clarifications
```python
Headers: Authorization: Bearer {access_token}

Request:
{
  "session_id": "uuid4-session-id", 
  "answers": [
    {
      "lens": "discovery",
      "question": "Who is your primary target user?",
      "answer": "Small business owners who need inventory management"
    }
  ]
}

Response (202):
{
  "message": "Processing clarifications",
  "task_id": "uuid4-task-id"
}
```

#### GET /api/v1/projects/{project_id}/generation-status/{task_id}
```python
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "status": "processing", // queued, processing, completed, error
  "progress": 65,
  "current_step": "Generating flowchart",
  "estimated_time_remaining": 30,
  "result": null // populated when status is 'completed'
}

Response (200) - Completed:
{
  "status": "completed",
  "progress": 100, 
  "result": {
    "prd_content": "# Product Requirements Document...",
    "flowchart_content": "graph TD\n A[User] --> B[Frontend]...",
    "thinking_lens_status": {...}
  }
}
```

#### POST /api/v1/projects/{project_id}/iterate
```python
Headers: Authorization: Bearer {access_token}

Request:
{
  "mode": "agent", // agent or think
  "message": "Add payment processing requirements",
  "session_id": "uuid4-session-id"
}

Response (202):
{
  "message": "Processing iteration request", 
  "task_id": "uuid4-task-id"
}
```

### File Management Endpoints

#### POST /api/v1/projects/{project_id}/uploads
```python
Headers: Authorization: Bearer {access_token}
Content-Type: multipart/form-data

Request:
files: [File1, File2]

Response (201):
{
  "uploaded_files": [
    {
      "id": "64f5a1b2c3d4e5f6789012ab",
      "filename": "requirements.pdf",
      "size": 2048576,
      "url": "https://s3.amazonaws.com/presigned-url"
    }
  ]
}
```

#### GET /api/v1/projects/{project_id}/uploads
```python
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "files": [
    {
      "id": "64f5a1b2c3d4e5f6789012ab", 
      "filename": "requirements.pdf",
      "size": 2048576,
      "uploaded_at": "2024-01-15T10:30:00Z",
      "download_url": "https://s3.amazonaws.com/presigned-url"
    }
  ]
}
```

### Chat Management Endpoints

#### GET /api/v1/chats
```python
Headers: Authorization: Bearer {access_token}
Query Parameters:
- status: active|archived|deleted (default: active)
- limit: int (default: 20)
- offset: int (default: 0)

Response (200):
{
  "chats": [
    {
      "id": "64f5a1b2c3d4e5f6789012ab",
      "chat_name": "Mobile App Ideas",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-16T14:25:00Z",
      "last_message_at": "2024-01-16T14:25:00Z",
      "message_count": 15,
      "has_project": true,
      "project_id": "64f5a1b2c3d4e5f6789012cd"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```
#### POST /api/v1/chats

```python
Headers: Authorization: Bearer {access_token}

Request:
{
  "chat_name": "My New Product Chat" // Optional, auto-generated if not provided
}

Response (201):
{
  "chat_id": "64f5a1b2c3d4e5f6789012ab",
  "chat_name": "My New Product Chat",
  "created_at": "2024-01-16T10:30:00Z"
}

#### GET /api/v1/chats/{chat_id}
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "chat": {
    "id": "64f5a1b2c3d4e5f6789012ab",
    "chat_name": "Mobile App Ideas",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-16T14:25:00Z",
    "message_count": 15,
    "has_project": true,
    "project_id": "64f5a1b2c3d4e5f6789012cd"
  }
}
```
#### PUT /api/v1/chats/{chat_id}
```python
Headers: Authorization: Bearer {access_token}

Request:
{
  "chat_name": "Updated Chat Name"
}

Response (200):
{
  "message": "Chat updated successfully"
}
```

#### DELETE /api/v1/chats/{chat_id}
```python 
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "message": "Chat deleted successfully"
}
```
#### GET /api/v1/chats/{chat_id}/messages
```python
Headers: Authorization: Bearer {access_token}
Query Parameters:
- limit: int (default: 50)
- before: timestamp (for pagination)

Response (200):
{
  "messages": [
    {
      "id": "64f5a1b2c3d4e5f6789012ab",
      "message_type": "user",
      "content": "I want to create a fitness app",
      "timestamp": "2024-01-16T10:30:00Z",
      "attachments": []
    },
    {
      "id": "64f5a1b2c3d4e5f6789012ac",
      "message_type": "assistant", 
      "content": "That's a great idea! Let me help you...",
      "timestamp": "2024-01-16T10:31:00Z",
      "metadata": {
        "tokens_used": 150,
        "model_used": "gpt-4-1106-preview"
      }
    }
  ],
  "has_more": true,
  "next_before": "2024-01-16T10:30:00Z"
}
```
#### POST /api/v1/chats/{chat_id}/messages
```python 
Headers: Authorization: Bearer {access_token}
Content-Type: multipart/form-data

Request:
{
  "content": "Can you help me with user personas?",
  "files": [File1, File2] // Optional attachments
}

Response (201):
{
  "message_id": "64f5a1b2c3d4e5f6789012ab",
  "ai_response": {
    "content": "I'd be happy to help with user personas...",
    "suggested_actions": [
      {
        "type": "create_project",
        "label": "Convert to PRD Project",
        "description": "Ready to create a full PRD?"
      }
    ]
  }
}
```
#### POST /api/v1/chats/{chat_id}/convert-to-project
```python 
Headers: Authorization: Bearer {access_token}

Request:
{
  "project_name": "Fitness App PRD", // Optional
  "include_chat_history": true
}

Response (201):
{
  "project_id": "64f5a1b2c3d4e5f6789012ab",
  "message": "Chat converted to project successfully"
}
```

### Version Control Endpoints

#### GET /api/v1/projects/{project_id}/versions
```python
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "versions": [
    {
      "version": "v1.3",
      "timestamp": "2024-01-16T14:25:00Z", 
      "changes": "Added metrics section",
      "prd_url": "https://s3.amazonaws.com/presigned-url",
      "flowchart_url": "https://s3.amazonaws.com/presigned-url"
    }
  ]
}
```

#### POST /api/v1/projects/{project_id}/rollback
```python
Headers: Authorization: Bearer {access_token}

Request:
{
  "version": "v1.2"
}

Response (200):
{
  "message": "Successfully rolled back to v1.2",
  "current_version": "v1.2"
}
```



### WebSocket Endpoints

#### /ws/projects/{project_id}
```python
# Connection requires JWT token as query parameter
# ws://localhost:8000/ws/projects/{project_id}?token={jwt_token}

# Message Types
{
  "type": "agent_progress",
  "data": {
    "step": "Generating PRD",
    "progress": 45,
    "estimated_time": 60
  }
}

{
  "type": "agent_complete", 
  "data": {
    "prd_content": "...",
    "flowchart_content": "...",
    "thinking_lens_status": {...}
  }
}

{
  "type": "error",
  "data": {
    "message": "Agent execution failed",
    "error_code": "AGENT_TIMEOUT"
  }
}
```

#### /ws/chats/{chat_id}
```python
# Connection requires JWT token as query parameter
# ws://localhost:8000/ws/chats/{chat_id}?token={jwt_token}

# Message Types
{
  "type": "message_sent",
  "data": {
    "message_id": "64f5a1b2c3d4e5f6789012ab",
    "content": "User message content",
    "timestamp": "2024-01-16T10:30:00Z"
  }
}

{
  "type": "ai_response_streaming",
  "data": {
    "content_delta": "This is part of the response...",
    "is_complete": false
  }
}

{
  "type": "ai_response_complete",
  "data": {
    "message_id": "64f5a1b2c3d4e5f6789012ac", 
    "content": "Complete AI response",
    "suggested_actions": [
      {
        "type": "create_project",
        "label": "Convert to PRD"
      }
    ]
  }
}

{
  "type": "typing_indicator",
  "data": {
    "is_typing": true,
    "estimated_time": 5
  }
}
```
## 7. Security Measures

### Input Validation
- **Pydantic Models**: Strict type validation for all API inputs
- **File Upload Validation**: 
  - File type whitelist: `.pdf, .doc, .docx, .md, .png, .jpg, .jpeg`
  - Maximum file size: 10MB
  - Filename sanitization
- **SQL Injection Protection**: MongoDB parameterized queries only
- **XSS Prevention**: Input sanitization and output encoding

### Authentication Security
- **JWT Security**:
  - HS256 algorithm with 256-bit secret key
  - Short-lived access tokens (30 minutes)
  - Refresh token rotation
  - Token blacklisting on logout
- **Password Security**:
  - bcrypt hashing with 12 rounds
  - Password complexity requirements
  - Account lockout after 5 failed attempts (15-minute cooldown)

### API Security
- **CORS Configuration**: Restrict origins in production
- **Rate Limiting**: 
  - Authentication endpoints: 5 requests/minute
  - File uploads: 10 requests/hour
  - AI operations: 50 requests/hour
- **Request Size Limits**:
  - JSON payloads: 1MB maximum
  - File uploads: 10MB maximum per file
- **HTTP Security Headers**:
  ```python
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Strict-Transport-Security: max-age=31536000
  ```

### Data Security
- **MongoDB Security**:
  - Authentication enabled
  - Role-based access control
  - Connection encryption (TLS)
- **S3 Security**:
  - Private buckets with IAM policies
  - Presigned URLs for temporary access
  - Server-side encryption enabled
- **Redis Security**:
  - Authentication enabled
  - No sensitive data persistence
  - Connection encryption

### Environment Security
- **Environment Variables**: All secrets in environment variables
- **API Key Rotation**: Quarterly rotation schedule
- **Logging Security**: No sensitive data in logs
- **Error Handling**: Generic error messages to prevent information disclosure

## 8. Comprehensive Documentation

### Code Documentation Standards

#### Docstring Format (Google Style)
```python
def generate_clarification_questions(
    idea: str, 
    domain: str, 
    complexity_score: float
) -> List[ClarificationQuestion]:
    """Generate domain-specific clarification questions based on thinking lens criteria.
    
    Args:
        idea: The initial product idea from the user
        domain: Detected domain/industry (e.g., 'saas', 'ecommerce', 'mobile')
        complexity_score: Assessed complexity score between 0.0 and 1.0
        
    Returns:
        List of ClarificationQuestion objects with lens categorization
        
    Raises:
        ValidationError: If idea is empty or invalid
        LLMError: If AI model fails to generate questions
        
    Example:
        >>> questions = generate_clarification_questions(
        ...     "A fitness tracking app", 
        ...     "mobile", 
        ...     0.7
        ... )
        >>> len(questions)
        5
    """
```

#### Type Annotations
```python
from typing import Dict, List, Optional, Union
from pydantic import BaseModel

class ProjectResponse(BaseModel):
    id: str
    project_name: str
    status: Literal["active", "archived", "deleted"]
    thinking_lens_status: Dict[str, bool]
    created_at: datetime
    updated_at: datetime
```

### API Documentation
- **OpenAPI/Swagger**: Auto-generated from FastAPI
- **Postman Collection**: Maintained collection with examples
- **Authentication Examples**: Sample requests for all auth flows
- **Error Code Reference**: Comprehensive error code documentation

### Deployment Documentation

#### Docker Configuration
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=mongodb://mongo:27017/ai_prd_generator
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
      
  mongo:
    image: mongo:7.0
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"
      
  redis:
    image: redis:7.0
    ports:
      - "6379:6379"
      
  celery:
    build: .
    command: celery -A app.celery worker --loglevel=info
    depends_on:
      - mongo  
      - redis
      
volumes:
  mongo_data:
```

### Environment Configuration
```python
# .env.example
# Database
DATABASE_URL=mongodb://localhost:27017/ai_prd_generator
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET_KEY=your-super-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# AWS
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=ai-prd-generator-dev

# Application
DEBUG=False
CORS_ORIGINS=["http://localhost:3000"]
MAX_UPLOAD_SIZE=10485760  # 10MB
```

### Logging Configuration
```python
# logging_config.py
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
        if hasattr(record, 'project_id'):
            log_entry['project_id'] = record.project_id
        if hasattr(record, 'execution_time'):
            log_entry['execution_time_ms'] = record.execution_time
            
        return json.dumps(log_entry)

# Usage
logging.basicConfig(
    level=logging.INFO,
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)

logger = logging.getLogger(__name__)
logger.addHandler(logging.StreamHandler())
logger.handlers[0].setFormatter(JSONFormatter())
```

### Testing Documentation
```python
# Example test structure
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestAuthentication:
    def test_register_success(self):
        response = client.post("/api/v1/auth/register", json={
            "email": "test@example.com",
            "password": "password123",
            "full_name": "Test User"
        })
        assert response.status_code == 201
        assert "user_id" in response.json()
        
    def test_register_duplicate_email(self):
        # First registration
        client.post("/api/v1/auth/register", json={
            "email": "test@example.com",
            "password": "password123", 
            "full_name": "Test User"
        })
        
        # Duplicate registration
        response = client.post("/api/v1/auth/register", json={
            "email": "test@example.com",
            "password": "password456",
            "full_name": "Another User"
        })
        assert response.status_code == 400
        assert "Email already exists" in response.json()["error"]
```

### Performance Documentation
- **Load Testing**: JMeter/Locust test plans
- **Monitoring**: Application metrics and alerting setup
- **Caching Strategy**: Redis caching implementation details
- **Database Optimization**: Index strategies and query optimization

This comprehensive backend PRD provides all the technical specifications needed for your AI development agent to build a robust, scalable backend system with no ambiguity or scope for hallucination.