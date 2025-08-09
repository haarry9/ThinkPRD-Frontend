Authentication

POST
/api/v1/auth/register
Register a new user

Create a new user account with email and password:
Request body

application/json
Example Value
Schema
{
  "confirm_password": "SecurePass123!",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "password": "SecurePass123!"
}

POST
/api/v1/auth/login
User login

Authenticate user with email and password
Request body

application/json
Example Value
Schema
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

POST
/api/v1/auth/refresh
Refresh access token

Generate new access token using refresh token
Request body

application/json
Example Value
Schema
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
Code	Description	Links
200	
Successful Response

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
No links
422	
Validation Error

Media type

application/json
Example Value
Schema
{
  "detail": [
    {
      "loc": [
        "string",
        0
      ],
      "msg": "string",
      "type": "string"
    }
  ]
}

POST
/api/v1/auth/logout
User logout


Logout user by blacklisting tokens

POST
/api/v1/auth/change-password
Change password


Change user password (requires authentication)

Parameters
Try it out
No parameters

Request body

application/json
Example Value
Schema
{
  "confirm_password": "NewSecurePass123!",
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePass123!"
}
-------------------------------------
Users


GET
/api/v1/users/me
Get current user profile


Get the profile of the currently authenticated user


Responses
Code	Description	Links
200	
Successful Response

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "created_at": "2023-01-01T00:00:00Z",
  "email": "user@example.com",
  "id": "507f1f77bcf86cd799439011",
  "is_active": true,
  "is_verified": false,
  "last_login": "2023-01-02T10:30:00Z",
  "profile": {
    "bio": "Software developer",
    "first_name": "John",
    "last_name": "Doe"
  }
}

PUT
/api/v1/users/me
Update current user profile


Update the profile of the currently authenticated user
Request body

application/json
Example Value
Schema
{
  "bio": "Software developer passionate about technology",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890"
}
GET
/api/v1/users/{user_id}
Get user by ID

Get user profile by user ID (public information only)
Responses
Code	Description	Links
200	
Successful Response

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "created_at": "2023-01-01T00:00:00Z",
  "email": "user@example.com",
  "id": "507f1f77bcf86cd799439011",
  "is_active": true,
  "is_verified": false,
  "last_login": "2023-01-02T10:30:00Z",
  "profile": {
    "bio": "Software developer",
    "first_name": "John",
    "last_name": "Doe"
  }
}
