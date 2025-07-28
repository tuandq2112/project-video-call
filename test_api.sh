#!/bin/bash

echo "Testing Video Call API..."

# Test registration
echo "1. Registering user 'testuser'..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}')

echo "Register response: $REGISTER_RESPONSE"

# Test login
echo "2. Logging in user 'testuser'..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}')

echo "Login response: $LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "3. Testing /api/users with token..."
    USERS_RESPONSE=$(curl -s -X GET http://localhost:8080/api/users \
      -H "Authorization: Bearer $TOKEN")
    
    echo "Users response: $USERS_RESPONSE"
else
    echo "Failed to get token from login response"
fi 