#!/bin/bash

# Test Knowledge Base Search Endpoint

EMAIL="kenny@audico.co.za"
PASSWORD="Apwd4me-1"
BACKEND_URL="http://localhost:3002"
BOT_ID="8982d756-3cd0-4e2b-bf20-396e919cb354"

echo "=== Knowledge Base Search Test ==="
echo ""

# Step 1: Login
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "✗ Login failed"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

echo "✓ Login successful"
echo ""

# Step 2: Test search
echo "Step 2: Testing search endpoint..."
SEARCH_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/bots/$BOT_ID/knowledge/search" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query":"How do I reset my password?","limit":3,"threshold":0.7}')

echo "$SEARCH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SEARCH_RESPONSE"
echo ""

echo "=== Test Complete ==="
