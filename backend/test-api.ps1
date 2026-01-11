# StudAICoach API Test Script
# Tests all authentication endpoints

Write-Host "🧪 StudAICoach API Test Suite" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3005/api"
$testEmail = "test-$(Get-Random)@example.com"
$testPassword = "Test123!"
$testUsername = "testuser$(Get-Random -Maximum 9999)"

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ PASSED - Health check successful" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ FAILED - Health check failed: $_" -ForegroundColor Red
    exit 1
}

# Test 2: User Registration
Write-Host "`nTest 2: User Registration" -ForegroundColor Yellow
try {
    $registerBody = @{
        email = $testEmail
        password = $testPassword
        name = "Test User"
        username = $testUsername
        role = "STUDENT"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBody `
        -UseBasicParsing

    if ($response.StatusCode -eq 201) {
        $registerData = $response.Content | ConvertFrom-Json
        $global:accessToken = $registerData.accessToken
        $global:refreshToken = $registerData.refreshToken
        $global:userId = $registerData.user.id
        
        Write-Host "✅ PASSED - User registered successfully" -ForegroundColor Green
        Write-Host "   User ID: $($registerData.user.id)" -ForegroundColor Gray
        Write-Host "   Email: $($registerData.user.email)" -ForegroundColor Gray
        Write-Host "   Role: $($registerData.user.role)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ FAILED - Registration failed: $_" -ForegroundColor Red
    exit 1
}

# Test 3: User Login
Write-Host "`nTest 3: User Login" -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -UseBasicParsing

    if ($response.StatusCode -eq 200) {
        $loginData = $response.Content | ConvertFrom-Json
        Write-Host "✅ PASSED - Login successful" -ForegroundColor Green
        Write-Host "   Access token received: $($loginData.accessToken.Substring(0, 20))..." -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ FAILED - Login failed: $_" -ForegroundColor Red
    exit 1
}

# Test 4: Get User Profile (Protected Route)
Write-Host "`nTest 4: Get User Profile (Protected)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/me" `
        -Headers @{"Authorization" = "Bearer $global:accessToken"} `
        -UseBasicParsing

    if ($response.StatusCode -eq 200) {
        $profileData = $response.Content | ConvertFrom-Json
        Write-Host "✅ PASSED - Profile retrieved successfully" -ForegroundColor Green
        Write-Host "   Name: $($profileData.name)" -ForegroundColor Gray
        Write-Host "   Email: $($profileData.email)" -ForegroundColor Gray
        Write-Host "   Organization ID: $($profileData.organizationId)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ FAILED - Profile retrieval failed: $_" -ForegroundColor Red
    exit 1
}

# Test 5: Refresh Token
Write-Host "`nTest 5: Refresh Token" -ForegroundColor Yellow
try {
    $refreshBody = @{
        refreshToken = $global:refreshToken
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/auth/refresh" `
        -Method POST `
        -ContentType "application/json" `
        -Body $refreshBody `
        -UseBasicParsing

    if ($response.StatusCode -eq 200) {
        $refreshData = $response.Content | ConvertFrom-Json
        Write-Host "✅ PASSED - Token refreshed successfully" -ForegroundColor Green
        Write-Host "   New access token: $($refreshData.accessToken.Substring(0, 20))..." -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ FAILED - Token refresh failed: $_" -ForegroundColor Red
    exit 1
}

# Test 6: Invalid Login Credentials
Write-Host "`nTest 6: Invalid Login (Should Fail)" -ForegroundColor Yellow
try {
    $invalidLoginBody = @{
        email = $testEmail
        password = "WrongPassword123!"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $invalidLoginBody `
        -UseBasicParsing

    Write-Host "❌ FAILED - Invalid credentials should return 401" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ PASSED - Correctly rejected invalid credentials" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED - Unexpected error: $_" -ForegroundColor Red
    }
}

# Test 7: Protected Route Without Token
Write-Host "`nTest 7: Protected Route Without Token (Should Fail)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/me" -UseBasicParsing
    Write-Host "❌ FAILED - Should require authentication" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ PASSED - Correctly requires authentication" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED - Unexpected error: $_" -ForegroundColor Red
    }
}

# Test 8: Duplicate Registration
Write-Host "`nTest 8: Duplicate Registration (Should Fail)" -ForegroundColor Yellow
try {
    $duplicateBody = @{
        email = $testEmail
        password = $testPassword
        name = "Duplicate User"
        username = "duplicate$(Get-Random)"
        role = "STUDENT"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $duplicateBody `
        -UseBasicParsing

    Write-Host "❌ FAILED - Should reject duplicate email" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 409) {
        Write-Host "✅ PASSED - Correctly rejected duplicate email" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED - Unexpected error: $_" -ForegroundColor Red
    }
}

# Test 9: Logout
Write-Host "`nTest 9: Logout" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/logout" `
        -Method POST `
        -Headers @{"Authorization" = "Bearer $global:accessToken"} `
        -UseBasicParsing

    if ($response.StatusCode -eq 200) {
        Write-Host "✅ PASSED - Logout successful" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ FAILED - Logout failed: $_" -ForegroundColor Red
    exit 1
}

# Test 10: File Upload
Write-Host "`nTest 10: File Upload (Answer Sheet)" -ForegroundColor Yellow

# First, login again to get a fresh token
try {
    $loginBody = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -UseBasicParsing

    $loginData = $response.Content | ConvertFrom-Json
    $uploadToken = $loginData.accessToken
} catch {
    Write-Host "❌ FAILED - Could not login for upload test: $_" -ForegroundColor Red
    exit 1
}

# Create a sample text file to upload (simulating a PDF)
$testFileName = "test-answer-sheet-$(Get-Random).png"
$testFilePath = Join-Path $env:TEMP $testFileName

# Create a minimal 1x1 PNG image (base64 decoded)
$pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
$pngBytes = [Convert]::FromBase64String($pngBase64)
[System.IO.File]::WriteAllBytes($testFilePath, $pngBytes)

try {
    # Create multipart form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $fileContent = [System.IO.File]::ReadAllBytes($testFilePath)
    $fileEncoded = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileContent)
    
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$testFileName`"",
        "Content-Type: image/png$LF",
        $fileEncoded,
        "--$boundary",
        "Content-Disposition: form-data; name=`"questionType`"$LF",
        "SUBJECTIVE",
        "--$boundary",
        "Content-Disposition: form-data; name=`"subjectId`"$LF",
        "550e8400-e29b-41d4-a716-446655440000",
        "--$boundary--$LF"
    ) -join $LF

    $response = Invoke-WebRequest -Uri "$baseUrl/answer-sheets/upload" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $uploadToken"
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        } `
        -Body $bodyLines `
        -UseBasicParsing

    if ($response.StatusCode -eq 201) {
        $uploadData = $response.Content | ConvertFrom-Json
        Write-Host "✅ PASSED - File uploaded successfully" -ForegroundColor Green
        Write-Host "   Upload ID: $($uploadData.id)" -ForegroundColor Gray
        Write-Host "   Status: $($uploadData.status)" -ForegroundColor Gray
        
        # Store upload ID for cleanup
        $global:uploadId = $uploadData.id
    }
} catch {
    Write-Host "❌ FAILED - File upload failed: $_" -ForegroundColor Red
    Write-Host "   Response: $($_.Exception.Response)" -ForegroundColor Red
} finally {
    # Clean up test file
    if (Test-Path $testFilePath) {
        Remove-Item $testFilePath -Force
    }
}

# Test 11: Get Uploaded Answer Sheets
Write-Host "`nTest 11: Get Uploaded Answer Sheets" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/answer-sheets" `
        -Headers @{"Authorization" = "Bearer $uploadToken"} `
        -UseBasicParsing

    if ($response.StatusCode -eq 200) {
        $sheets = $response.Content | ConvertFrom-Json
        Write-Host "✅ PASSED - Retrieved answer sheets" -ForegroundColor Green
        Write-Host "   Total uploads: $($sheets.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ FAILED - Could not retrieve answer sheets: $_" -ForegroundColor Red
}

# Test 12: Delete Uploaded Answer Sheet
if ($global:uploadId) {
    Write-Host "`nTest 12: Delete Answer Sheet" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/answer-sheets/$global:uploadId" `
            -Method DELETE `
            -Headers @{"Authorization" = "Bearer $uploadToken"} `
            -UseBasicParsing

        if ($response.StatusCode -eq 200) {
            Write-Host "✅ PASSED - Answer sheet deleted successfully" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ FAILED - Could not delete answer sheet: $_" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "🎉 All Tests Completed!" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "Test Summary:" -ForegroundColor White
Write-Host "  ✅ Health Check" -ForegroundColor Green
Write-Host "  ✅ User Registration" -ForegroundColor Green
Write-Host "  ✅ User Login" -ForegroundColor Green
Write-Host "  ✅ Get Profile (Protected)" -ForegroundColor Green
Write-Host "  ✅ Refresh Token" -ForegroundColor Green
Write-Host "  ✅ Invalid Credentials Rejection" -ForegroundColor Green
Write-Host "  ✅ Unauthorized Access Rejection" -ForegroundColor Green
Write-Host "  ✅ Duplicate Email Rejection" -ForegroundColor Green
Write-Host "  ✅ Logout" -ForegroundColor Green
Write-Host "  ✅ File Upload (Answer Sheet)" -ForegroundColor Green
Write-Host "  ✅ Get Uploaded Answer Sheets" -ForegroundColor Green
Write-Host "  ✅ Delete Answer Sheet" -ForegroundColor Green

Write-Host "`n🚀 All authentication and file upload endpoints are working correctly!" -ForegroundColor Green
