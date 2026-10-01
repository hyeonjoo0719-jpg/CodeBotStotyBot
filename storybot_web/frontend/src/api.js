const TOKEN_KEY = 'storybot_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // localStorage를 쓸 수 없는 환경은 무시
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function errorMessage(status, data) {
  if (typeof data?.detail === 'string') return data.detail
  if (Array.isArray(data?.detail)) return '입력값을 다시 확인해 주세요.'
  return `서버 오류가 발생했습니다. (${status})`
}

export async function api(method, path, body) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다.')
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)

  if (!res.ok) {
    // 토큰이 만료되었거나 잘못된 경우 로그아웃 처리
    if (res.status === 401 && token) {
      setToken(null)
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    throw new ApiError(res.status, errorMessage(res.status, data))
  }
  return data
}
