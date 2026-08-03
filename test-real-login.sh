#!/bin/bash

cd ~/zovo-builder-dashboard || exit

echo "=== AUTH REAL LOGIN TEST ==="

CSRF=$(curl -s -c cookies.txt \
https://builder.zovo.ca/api/auth/csrf | \
grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

echo "CSRF:"
echo $CSRF


echo ""
echo "=== LOGIN ==="

curl -i \
-b cookies.txt \
-c cookies.txt \
-X POST \
https://builder.zovo.ca/api/auth/callback/credentials \
-H "Content-Type: application/x-www-form-urlencoded" \
-d "csrfToken=$CSRF&email=test6@zovo.ca&password=Test123456&redirect=false"


echo ""
echo ""
echo "=== SESSION ==="

curl -b cookies.txt \
https://builder.zovo.ca/api/auth/session

echo ""

