# StudAICoach API User Guide

This guide provides a comprehensive overview of the StudAICoach API endpoints.

## Base URL

The base URL for all API endpoints is `/api`.

## Authentication

Most endpoints require authentication using a JWT token. The token should be included in the `Authorization` header as a Bearer token:

`Authorization: Bearer <your-jwt-token>`

## General Endpoints

### GET /

- **Description:** Returns a welcome message and basic API information.
- **Authentication:** None
- **Response:**
  ```json
  {
    "message": "StudAICoach API is running!",
    "version": "1.0.0",
    "endpoints": {
      "auth": "/api/auth",
      "docs": "/api/docs"
    }
  }
  ```

### GET /health

- **Description:** Returns the health status of the API.
- **Authentication:** None
- **Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2023-10-27T10:00:00.000Z"
  }
  ```

## Auth Module

### POST /auth/register

- **Description:** Registers a new user.
- **Authentication:** None
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "Test User"
  }
  ```
- **Response:**
  ```json
  {
    "id": "user-id",
    "email": "user@example.com",
    "name": "Test User"
  }
  ```

### POST /auth/login

- **Description:** Logs in a user and returns JWT tokens.
- **Authentication:** None
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "accessToken": "your-access-token",
    "refreshToken": "your-refresh-token"
  }
  ```

### POST /auth/refresh

- **Description:** Refreshes an access token using a refresh token.
- **Authentication:** None
- **Request Body:**
  ```json
  {
    "refreshToken": "your-refresh-token"
  }
  ```
- **Response:**
  ```json
  {
    "accessToken": "your-new-access-token"
  }
  ```

### GET /auth/me

- **Description:** Returns the profile of the currently authenticated user.
- **Authentication:** JWT Token
- **Response:**
  ```json
  {
    "id": "user-id",
    "email": "user@example.com",
    "name": "Test User"
  }
  ```

### POST /auth/logout

- **Description:** Logs out the user.
- **Authentication:** JWT Token
- **Response:**
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

## Answer Sheets Module

### POST /answer-sheets/upload

- **Description:** Uploads an answer sheet for OCR processing.
- **Authentication:** JWT Token
- **Request:** `multipart/form-data` with a `file` field.
- **Response:**
  ```json
  {
    "id": "answer-sheet-id",
    "status": "processing"
  }
  ```

### GET /answer-sheets

- **Description:** Returns all answer sheets for the current user.
- **Authentication:** JWT Token
- **Response:** An array of answer sheet objects.

### GET /answer-sheets/:id

- **Description:** Returns a specific answer sheet by ID.
- **Authentication:** JWT Token
- **Response:** An answer sheet object.

### DELETE /answer-sheets/:id

- **Description:** Deletes a specific answer sheet by ID.
- **Authentication:** JWT Token
- **Response:**
  ```json
  {
    "message": "Answer sheet deleted successfully"
  }
  ```

## Subjects Module

### GET /subjects

- **Description:** Returns a list of all subjects. Can be filtered by `board` and `grade`.
- **Authentication:** None
- **Query Parameters:**
  - `board` (optional): e.g., "CBSE"
  - `grade` (optional): e.g., "10"
- **Response:** An array of subject objects.

### POST /subjects

- **Description:** Creates a new subject. (SUPER_ADMIN only)
- **Authentication:** JWT Token with SUPER_ADMIN role.
- **Request Body:**
  ```json
  {
    "name": "Mathematics",
    "code": "MATH101",
    "board": "CBSE",
    "grade": 10
  }
  ```
- **Response:** The newly created subject object.

### PUT /subjects/:id

- **Description:** Updates a subject. (SUPER_ADMIN only)
- **Authentication:** JWT Token with SUPER_ADMIN role.
- **Request Body:**
  ```json
  {
    "name": "Advanced Mathematics"
  }
  ```
- **Response:** The updated subject object.

### DELETE /subjects/:id

- **Description:** Deletes a subject. (SUPER_ADMIN only)
- **Authentication:** JWT Token with SUPER_ADMIN role.
- **Response:**
  ```json
  {
    "message": "Subject deleted successfully"
  }
  ```
