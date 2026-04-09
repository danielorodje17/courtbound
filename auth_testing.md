# Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session
DB_NAME=$(grep DB_NAME /app/backend/.env | cut -d '=' -f2)
mongosh --eval "
use('$DB_NAME');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({ user_id: userId, email: 'test.user@example.com', name: 'Test User', picture: '', created_at: new Date() });
db.user_sessions.insertOne({ user_id: userId, session_token: sessionToken, expires_at: new Date(Date.now() + 7*24*60*60*1000), created_at: new Date() });
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"

## Step 2: Test Backend API
curl -X GET "https://your-app.com/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
curl -X GET "https://your-app.com/api/my-colleges" -H "Authorization: Bearer YOUR_SESSION_TOKEN"

## Step 3: Browser Testing (inject session_token into localStorage via Playwright)
# localStorage.setItem('courtbound_session_token', 'YOUR_SESSION_TOKEN')
# Then navigate to /dashboard - should load without redirect to /login

## Checklist
- User document has user_id field (custom UUID)
- Session user_id matches user's user_id exactly
- /api/auth/me returns user data with token in Authorization header
- Dashboard loads without redirect
- All protected routes return data (not 401)
