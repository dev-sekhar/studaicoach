# StudAICoach API Testing Guide

This guide provides instructions on how to test the StudAICoach API endpoints using `curl`.

## Prerequisites

- The StudAICoach backend server must be running locally.
- You will need `curl` and `jq` (for parsing JSON in the terminal) installed.

## Setup

First, let's set up some environment variables in your terminal:

```bash
export BASE_URL="http://localhost:3005/api"
export TEST_EMAIL="test-$(date +%s)@example.com"
export TEST_PASSWORD="password123"
```

## General Endpoints

### Health Check

```bash
curl -s $BASE_URL/health | jq
```

You should see a response like this:
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

## Authentication

### 1. Register a new user

```bash
curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Test User\"}" | jq
```

### 2. Log in

```bash
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo $LOGIN_RESPONSE | jq
```

### 3. Store the tokens

Now, store the access token in an environment variable for authenticated requests:

```bash
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r .accessToken)
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r .refreshToken)
```

### 4. Get user profile

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/auth/me" | jq
```

### 5. Refresh token

```bash
curl -s -X POST "$BASE_URL/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" | jq
```

### 6. Logout

```bash
curl -s -X POST "$BASE_URL/auth/logout" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

## Answer Sheets Module

First, create a dummy file to upload:
```bash
touch sample-sheet.png
```

### 1. Upload an answer sheet

```bash
curl -s -X POST "$BASE_URL/answer-sheets/upload" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "file=@sample-sheet.png" | jq
```
*Note the ID from the response for the next steps.*

### 2. Get all answer sheets

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/answer-sheets" | jq
```

### 3. Get an answer sheet by ID

Replace `<answer-sheet-id>` with an ID from the previous step.

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/answer-sheets/<answer-sheet-id>" | jq
```

### 4. Delete an answer sheet

Replace `<answer-sheet-id>` with an ID.

```bash
curl -s -X DELETE -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/answer-sheets/<answer-sheet-id>" | jq
```

## Subjects Module

### 1. Get all subjects

```bash
curl -s $BASE_URL/subjects | jq
```

### 2. Get subjects with filters

```bash
curl -s "$BASE_URL/subjects?board=CBSE&grade=10" | jq
```

### 3. Create, Update, and Delete Subjects (SUPER_ADMIN only)

These endpoints require a user with the `SUPER_ADMIN` role.

#### Create a subject

```bash
curl -s -X POST "$BASE_URL/subjects" \
    -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Physics","code":"PHY101","board":"CBSE","grade":10}' | jq
```

#### Update a subject

Replace `<subject-id>` with a valid ID.

```bash
curl -s -X PUT "$BASE_URL/subjects/<subject-id>" \
    -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Advanced Physics"}' | jq
```

#### Delete a subject

Replace `<subject-id>` with a valid ID.

```bash
curl -s -X DELETE -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" "$BASE_URL/subjects/<subject-id>" | jq
```
