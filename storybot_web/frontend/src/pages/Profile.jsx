import { useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import { formatDate } from '../utils.js'

export default function Profile() {
  const { user, setUser } = useAuth()
  const [nickname, setNickname] = useState(user.nickname)
  const [nickMsg, setNickMsg] = useState({ type: '', text: '' })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' })
  const [busy, setBusy] = useState(false)

  async function saveNickname(e) {
    e.preventDefault()
    const value = nickname.trim()
    if (!value || value.length > 20) return setNickMsg({ type: 'error', text: '닉네임은 1~20자여야 합니다.' })
    setBusy(true)
    try {
      setUser(await api('PATCH', '/users/me', { nickname: value }))
      setNickMsg({ type: 'success', text: '닉네임이 변경되었어요.' })
    } catch (err) {
      setNickMsg({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    if (pw.next.length < 8 || pw.next.length > 64)
      return setPwMsg({ type: 'error', text: '새 비밀번호는 8~64자여야 합니다.' })
    if (pw.next !== pw.confirm) return setPwMsg({ type: 'error', text: '새 비밀번호 확인이 일치하지 않습니다.' })
    setBusy(true)
    try {
      await api('PUT', '/users/me/password', { current_password: pw.current, new_password: pw.next })
      setPw({ current: '', next: '', confirm: '' })
      setPwMsg({ type: 'success', text: '비밀번호가 변경되었어요.' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack narrow">
      <h1 className="title">🎀 내 정보</h1>

      <section className="card">
        <div className="profile-row">
          <span className="label">아이디</span>
          <span>{user.username}</span>
        </div>
        <div className="profile-row">
          <span className="label">가입일</span>
          <span>{formatDate(user.created_at)}</span>
        </div>
      </section>

      <form className="card" onSubmit={saveNickname}>
        <h2 className="section-title">닉네임 변경</h2>
        <label className="field">
          <span>닉네임</span>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} />
        </label>
        {nickMsg.text && <p className={nickMsg.type}>{nickMsg.text}</p>}
        <button className="btn btn-primary" disabled={busy}>
          저장
        </button>
      </form>

      <form className="card" onSubmit={savePassword}>
        <h2 className="section-title">비밀번호 변경</h2>
        <label className="field">
          <span>현재 비밀번호</span>
          <input
            type="password"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
            autoComplete="current-password"
            required
          />
        </label>
        <label className="field">
          <span>새 비밀번호</span>
          <input
            type="password"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
            placeholder="8자 이상"
            autoComplete="new-password"
          />
        </label>
        <label className="field">
          <span>새 비밀번호 확인</span>
          <input
            type="password"
            value={pw.confirm}
            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            autoComplete="new-password"
          />
        </label>
        {pwMsg.text && <p className={pwMsg.type}>{pwMsg.text}</p>}
        <button className="btn btn-primary" disabled={busy}>
          비밀번호 변경
        </button>
      </form>
    </div>
  )
}
