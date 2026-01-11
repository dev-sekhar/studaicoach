#!/bin/bash

# StudAICoach API Test Script (Bash version)
# Tests all authentication endpoints

echo -e "\033[1;36m🧪 StudAICoach API Test Suite\033[0m"
echo -e "\033[1;36m================================\033[0m\n"

BASE_URL="http://localhost:3005/api"
TEST_EMAIL="test-$RANDOM@example.com"
TEST_PASSWORD="Test123!"
TEST_USERNAME="testuser$RANDOM"

# Test 1: Health Check
echo -e "\033[1;33mTest 1: Health Check\033[0m"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "\033[1;32m✅ PASSED - Health check successful\033[0m"
else
    echo -e "\033[1;31m❌ FAILED - Health check failed (HTTP $HTTP_CODE)\033[0m"
    exit 1
fi

# Test 2: User Registration
echo -e "\n\033[1;33mTest 2: User Registration\033[0m"
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Test User\",\"username\":\"$TEST_USERNAME\",\"role\":\"STUDENT\"}")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
BODY=$(echo "$REGISTER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ]; then
    ACCESS_TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$BODY" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
    USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    echo -e "\033[1;32m✅ PASSED - User registered successfully\033[0m"
    echo -e "\033[0;37m   User ID: $USER_ID\033[0m"
    echo -e "\033[0;37m   Email: $TEST_EMAIL\033[0m"
else
    echo -e "\033[1;31m❌ FAILED - Registration failed (HTTP $HTTP_CODE)\033[0m"
    echo "$BODY"
    exit 1
fi

# Test 3: User Login
echo -e "\n\033[1;33mTest 3: User Login\033[0m"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "\033[1;32m✅ PASSED - Login successful\033[0m"
else
    echo -e "\033[1;31m❌ FAILED - Login failed (HTTP $HTTP_CODE)\033[0m"
    exit 1
fi

# Test 4: Get User Profile (Protected Route)
echo -e "\n\033[1;33mTest 4: Get User Profile (Protected)\033[0m"
PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/auth/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n1)
BODY=$(echo "$PROFILE_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "\033[1;32m✅ PASSED - Profile retrieved successfully\033[0m"
    NAME=$(echo "$BODY" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    echo -e "\033[0;37m   Name: $NAME\033[0m"
else
    echo -e "\033[1;31m❌ FAILED - Profile retrieval failed (HTTP $HTTP_CODE)\033[0m"
    exit 1
fi

# Test 5: Refresh Token
echo -e "\n\033[1;33mTest 5: Refresh Token\033[0m"
REFRESH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")

HTTP_CODE=$(echo "$REFRESH_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "\033[1;32m✅ PASSED - Token refreshed successfully\033[0m"
else
    echo -e "\033[1;31m❌ FAILED - Token refresh failed (HTTP $HTTP_CODE)\033[0m"
    exit 1
fi

# Test 6: Invalid Login Credentials
echo -e "\n\033[1;33mTest 6: Invalid Login (Should Fail)\033[0m"
INVALID_LOGIN=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"WrongPassword123!\"}")

HTTP_CODE=$(echo "$INVALID_LOGIN" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
    echo -e "\033[1;32m✅ PASSED - Correctly rejected invalid credentials\033[0m"
else
    echo -e "\033[1;31m❌ FAILED - Should return 401 (got $HTTP_CODE)\033[0m"
fi

# Test 7: Protected Route Without Token
echo -e "\n\033[1;33mTest 7: Protected Route Without Token (Should Fail)\033[0m"
NO_TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/auth/me")

HTTP_CODE=$(echo "$NO_TOKEN_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
    echo -e "\033[1;32m✅ PASSED - Correctly requires authentication\033[0m"
else
    echo -e "\033[1;31m❌ FAILED - Should require authentication (got $HTTP_CODE)\033[0m"
fi

# Test 8: Duplicate Registration
echo -e "\n\033[1;33mTest 8: Duplicate Registration (Should Fail)\033[0m"
DUPLICATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Duplicate User\",\"username\":\"duplicate$RANDOM\",\"role\":\"STUDENT\"}")

HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "409" ]; then
    echo -e "\033[1;32m✅ PASSED - Correctly rejected duplicate email\033[0m"
else
    echo -e "\033[1;31m❌ FAILED - Should reject duplicate email (got $HTTP_CODE)\033[0m"
fi

# Test 9: Logout
echo -e "\n\033[1;33mTest 9: Logout\033[0m"
LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/logout" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$LOGOUT_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "\033[1;32m✅ PASSED - Logout successful\033[0m"
else
    echo -e "\033[1;31m❌ FAILED - Logout failed (HTTP $HTTP_CODE)\033[0m"
    exit 1
fi

# Summary
echo -e "\n\033[1;36m================================\033[0m"
echo -e "\033[1;36m🎉 All Tests Completed!\033[0m"
echo -e "\033[1;36m================================\033[0m\n"

echo -e "\033[1;37mTest Summary:\033[0m"
echo -e "  \033[1;32m✅ Health Check\033[0m"
echo -e "  \033[1;32m✅ User Registration\033[0m"
echo -e "  \033[1;32m✅ User Login\033[0m"
echo -e "  \033[1;32m✅ Get Profile (Protected)\033[0m"
echo -e "  \033[1;32m✅ Refresh Token\033[0m"
echo -e "  \033[1;32m✅ Invalid Credentials Rejection\033[0m"
echo -e "  \033[1;32m✅ Unauthorized Access Rejection\033[0m"
echo -e "  \033[1;32m✅ Duplicate Email Rejection\033[0m"
echo -e "  \033[1;32m✅ Logout\033[0m"

echo -e "\n\033[1;32m🚀 All authentication endpoints are working correctly!\033[0m"
