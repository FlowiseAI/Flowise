#!/bin/bash

# Race Condition Test Script (Bash version)
# This script sends multiple concurrent requests to test the default chatflow creation race condition

# Configuration
BASE_URL="${API_BASE_URL:-http://localhost:4000}"
AUTH_TOKEN="${TEST_AUTH_TOKEN:-}"
CONCURRENT_REQUESTS=5

if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ Please provide TEST_AUTH_TOKEN environment variable"
    echo "Usage: TEST_AUTH_TOKEN=\"your-jwt-token\" ./test-race-condition.sh"
    exit 1
fi

echo "🏁 Starting Race Condition Test"
echo "   Concurrent requests: $CONCURRENT_REQUESTS"
echo "   Target URL: $BASE_URL/api/v1/auth/me"
echo ""

# Function to make a single request
make_request() {
    local request_id=$1
    local start_time=$(date +%s)
    
    local response=$(curl -s -w "\n%{http_code}\n%{time_total}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        "$BASE_URL/api/v1/auth/me" 2>/dev/null)
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Parse response
    local body=$(echo "$response" | head -n 1)
    local http_code=$(echo "$response" | tail -n 2 | head -n 1)
    local time_total=$(echo "$response" | tail -n 1)
    
    if [ "$http_code" = "200" ]; then
        # Extract defaultChatflowId using basic text processing
        local chatflow_id=$(echo "$body" | grep -o '"defaultChatflowId":"[^"]*"' | cut -d'"' -f4)
        if [ -z "$chatflow_id" ] || [ "$chatflow_id" = "null" ]; then
            chatflow_id="null"
        fi
        
        echo "✅ Request $request_id: Success (${duration}ms) - Chatflow: $chatflow_id"
        echo "$request_id:$chatflow_id" >> /tmp/race_test_results.txt
    else
        echo "❌ Request $request_id: Failed ($http_code) (${duration}ms)"
        echo "$request_id:ERROR" >> /tmp/race_test_results.txt
    fi
}

# Clear previous results
rm -f /tmp/race_test_results.txt

# Launch concurrent requests
echo "🚀 Launching $CONCURRENT_REQUESTS concurrent requests..."
for i in $(seq 1 $CONCURRENT_REQUESTS); do
    make_request $i &
done

# Wait for all background jobs to complete
wait

echo ""
echo "📊 Test Results:"
echo "================"

# Analyze results
if [ -f /tmp/race_test_results.txt ]; then
    total_requests=$(wc -l < /tmp/race_test_results.txt)
    successful_requests=$(grep -v "ERROR" /tmp/race_test_results.txt | wc -l)
    failed_requests=$(grep "ERROR" /tmp/race_test_results.txt | wc -l)
    
    echo "✅ Successful requests: $successful_requests/$total_requests"
    echo "❌ Failed requests: $failed_requests/$total_requests"
    
    if [ $successful_requests -gt 0 ]; then
        # Extract unique chatflow IDs (excluding null and ERROR)
        unique_chatflows=$(grep -v "ERROR" /tmp/race_test_results.txt | cut -d':' -f2 | grep -v "null" | sort -u | wc -l)
        
        echo ""
        echo "🔍 Race Condition Analysis:"
        echo "   Unique default chatflow IDs created: $unique_chatflows"
        
        if [ $unique_chatflows -gt 1 ]; then
            echo "⚠️  RACE CONDITION DETECTED! Multiple chatflows created:"
            grep -v "ERROR" /tmp/race_test_results.txt | cut -d':' -f2 | grep -v "null" | sort -u | while read chatflow_id; do
                echo "     Chatflow ID: $chatflow_id"
            done
        elif [ $unique_chatflows -eq 1 ]; then
            echo "✅ No race condition detected - only one chatflow created"
            chatflow_id=$(grep -v "ERROR" /tmp/race_test_results.txt | cut -d':' -f2 | grep -v "null" | head -n 1)
            echo "   Chatflow ID: $chatflow_id"
        else
            echo "⚠️  No default chatflows were created"
        fi
        
        echo ""
        echo "📝 Individual Request Results:"
        while IFS=':' read -r request_id chatflow_id; do
            if [ "$chatflow_id" = "ERROR" ]; then
                echo "   ❌ Request $request_id: Failed"
            else
                echo "   ✅ Request $request_id: $chatflow_id"
            fi
        done < /tmp/race_test_results.txt
    fi
fi

# Cleanup
rm -f /tmp/race_test_results.txt

echo ""
echo "💾 To verify in database, run:"
echo "SELECT cf.id, cf.\"userId\", cf.\"parentChatflowId\", cf.\"createdDate\""
echo "FROM \"chatflow\" cf"
echo "JOIN \"user\" u ON cf.\"userId\" = u.id"
echo "WHERE u.auth0_id = 'YOUR_AUTH0_ID'"
echo "  AND cf.\"parentChatflowId\" IS NOT NULL"
echo "ORDER BY cf.\"createdDate\" DESC;"
