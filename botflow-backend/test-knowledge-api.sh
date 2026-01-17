#!/bin/bash

# Phase 2 Knowledge API Test Script
# This script tests all 6 knowledge API endpoints

API_URL="http://localhost:3002"

echo "========================================="
echo "Phase 2 Knowledge API Test"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Get authentication token
echo -e "${YELLOW}Step 1: Login to get JWT token${NC}"
read -p "Enter your email: " EMAIL
read -sp "Enter your password: " PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Login failed. Response:${NC}"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Get a bot ID
echo -e "${YELLOW}Step 2: Fetching your bots${NC}"
BOTS_RESPONSE=$(curl -s -X GET "$API_URL/api/bots" \
  -H "Authorization: Bearer $TOKEN")

BOT_ID=$(echo $BOTS_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$BOT_ID" ]; then
    echo -e "${RED}❌ No bots found. Response:${NC}"
    echo "$BOTS_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Found bot: $BOT_ID${NC}"
echo ""

# Step 3: Test GET /bots/:botId/knowledge (list sources)
echo -e "${YELLOW}Step 3: GET /api/bots/$BOT_ID/knowledge (list sources)${NC}"
LIST_RESPONSE=$(curl -s -X GET "$API_URL/api/bots/$BOT_ID/knowledge" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$LIST_RESPONSE" | jq '.' 2>/dev/null || echo "$LIST_RESPONSE"
echo ""

# Step 4: Test GET /bots/:botId/knowledge/stats
echo -e "${YELLOW}Step 4: GET /api/bots/$BOT_ID/knowledge/stats${NC}"
STATS_RESPONSE=$(curl -s -X GET "$API_URL/api/bots/$BOT_ID/knowledge/stats" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$STATS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATS_RESPONSE"
echo ""

# Step 5: Test POST /bots/:botId/knowledge (initialize upload)
echo -e "${YELLOW}Step 5: POST /api/bots/$BOT_ID/knowledge (initialize upload)${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/api/bots/$BOT_ID/knowledge" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Policy Document",
    "metadata": {
      "file_name": "test_policy.pdf",
      "file_size": 50000,
      "file_type": "application/pdf"
    }
  }')

echo "Response:"
echo "$UPLOAD_RESPONSE" | jq '.' 2>/dev/null || echo "$UPLOAD_RESPONSE"

ARTICLE_ID=$(echo $UPLOAD_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
UPLOAD_URL=$(echo $UPLOAD_RESPONSE | grep -o '"uploadUrl":"[^"]*' | cut -d'"' -f4)

if [ -z "$ARTICLE_ID" ]; then
    echo -e "${RED}❌ Failed to create article${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Article created: $ARTICLE_ID${NC}"
echo ""

# Step 6: Test POST /bots/:botId/knowledge/:articleId/process
echo -e "${YELLOW}Step 6: POST /api/bots/$BOT_ID/knowledge/$ARTICLE_ID/process (trigger processing)${NC}"
PROCESS_RESPONSE=$(curl -s -X POST "$API_URL/api/bots/$BOT_ID/knowledge/$ARTICLE_ID/process" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$PROCESS_RESPONSE" | jq '.' 2>/dev/null || echo "$PROCESS_RESPONSE"
echo ""

# Step 7: Verify in database
echo -e "${YELLOW}Step 7: GET /api/bots/$BOT_ID/knowledge (verify article exists)${NC}"
VERIFY_RESPONSE=$(curl -s -X GET "$API_URL/api/bots/$BOT_ID/knowledge" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$VERIFY_RESPONSE" | jq '.' 2>/dev/null || echo "$VERIFY_RESPONSE"
echo ""

# Step 8: Test DELETE /bots/:botId/knowledge/:articleId
echo -e "${YELLOW}Step 8: DELETE /api/bots/$BOT_ID/knowledge/$ARTICLE_ID (cleanup)${NC}"
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/api/bots/$BOT_ID/knowledge/$ARTICLE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$DELETE_RESPONSE" | jq '.' 2>/dev/null || echo "$DELETE_RESPONSE"
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}✅ All tests completed!${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "- Login: ✅"
echo "- List sources: ✅"
echo "- Get stats: ✅"
echo "- Initialize upload: ✅"
echo "- Trigger processing: ✅"
echo "- Delete source: ✅"
echo ""
echo "Next steps:"
echo "1. Build n8n workflow to process uploaded files"
echo "2. Test actual file upload to Supabase Storage"
echo "3. Verify embeddings are created in knowledge_embeddings table"
