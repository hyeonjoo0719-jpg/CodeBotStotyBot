import { useState } from 'react'

const monoStyle = { fontFamily: 'monospace', fontSize: 14 }

export default function App() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setResult('')
    setError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : `서버 오류 (${res.status})`)
      } else {
        setResult(data.result)
      }
    } catch {
      setError('서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h1>CodeBot</h1>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={10}
        style={{ ...monoStyle, width: '100%', boxSizing: 'border-box' }}
        placeholder="코드의 앞부분을 입력하세요"
      />
      <button onClick={handleGenerate} disabled={loading} style={{ marginTop: 8 }}>
        {loading ? '생성 중...' : '생성'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <pre style={{ ...monoStyle, background: '#f4f4f4', padding: 12, whiteSpace: 'pre-wrap' }}>
          {result}
        </pre>
      )}
    </div>
  )
}
