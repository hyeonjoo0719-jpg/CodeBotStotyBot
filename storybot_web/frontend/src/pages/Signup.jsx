import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export default function Signup() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '', passwordConfirm: '', nickname: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(key) {
    return (e) => setForm({ ...form, [key]: e.target.value })
  }

  function validate() {
    if (!/^[A-Za-z0-9]{4,20}$/.test(form.username)) return '아이디는 영문/숫자 4~20자여야 합니다.'
    if (form.password.length < 8 || form.password.length > 64) return '비밀번호는 8~64자여야 합니다.'
    if (form.password !== form.passwordConfirm) return '비밀번호 확인이 일치하지 않습니다.'
    if (!form.nickname.trim() || form.nickname.length > 20) return '닉네임은 1~20자여야 합니다.'
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const message = validate()
    if (message) {
      setError(message)
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await api('POST', '/auth/signup', {
        username: form.username,
        password: form.password,
        nickname: form.nickname.trim(),
      })
      await login(form.username, form.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="auth-emoji">🌷</div>
        <h1 className="title">회원가입</h1>
        <p className="subtitle">이야기 친구가 되어 주세요</p>

        <label className="field">
          <span>아이디</span>
          <input value={form.username} onChange={update('username')} placeholder="영문/숫자 4~20자" autoComplete="username" />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input type="password" value={form.password} onChange={update('password')} placeholder="8자 이상" autoComplete="new-password" />
        </label>
        <label className="field">
          <span>비밀번호 확인</span>
          <input type="password" value={form.passwordConfirm} onChange={update('passwordConfirm')} autoComplete="new-password" />
        </label>
        <label className="field">
          <span>닉네임</span>
          <input value={form.nickname} onChange={update('nickname')} placeholder="1~20자" />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? '가입 중...' : '가입하기'}
        </button>
        <p className="auth-switch">
          이미 계정이 있나요? <Link to="/login">로그인</Link>
        </p>
      </form>
    </div>
  )
}
