import React from 'react'
import axios from 'axios'
import useApi from '@/hooks/useApi'   // our hook from src/hooks/useApi.jsx

// 1) Make an axios client with no baseURL (we build URLs in the hook)
const client = axios.create({
  withCredentials: true  // include cookies if your API needs them
})

export default function LoginButton() {
  // 2) Pass client.post to the hook
  const { request, data, loading, error } = useApi(client.post)

  // 3) Define your click handler
  const handleLogin = async () => {
    try {
      // this will POST to https://flowise-ai-cqlx.onrender.com/api/v1/auth/resolve
      const user = await request('/v1/auth/resolve', {
        data: { token: 'your-jwt-or-session-token' }
      })
      console.log('Logged in user:', user)
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <div>
      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'Logging in…' : 'Login'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error.message || error}</p>}
      {data && <p>Welcome, {data.username || data.name}!</p>}
    </div>
  )
}
