import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import HeartButton from '../components/HeartButton.jsx'
import { Loading } from '../components/RouteGuards.jsx'
import { formatDate } from '../utils.js'

export default function StoryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [story, setStory] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setStory(null)
    setLoadError('')
    setEditing(false)
    api('GET', `/stories/${id}`)
      .then((s) => !cancelled && setStory(s))
      .catch((err) => !cancelled && setLoadError(err.message))
    return () => {
      cancelled = true
    }
  }, [id])

  function startEdit() {
    setTitle(story.title)
    setContent(story.content)
    setError('')
    setEditing(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!title.trim() || title.length > 100) return setError('제목은 1~100자여야 합니다.')
    if (!content.trim()) return setError('본문을 입력해 주세요.')
    setSaving(true)
    setError('')
    try {
      setStory(await api('PATCH', `/stories/${id}`, { title: title.trim(), content }))
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function togglePublic() {
    setError('')
    try {
      setStory(await api('PATCH', `/stories/${id}`, { is_public: !story.is_public }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete() {
    if (!window.confirm('이 이야기를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
    try {
      await api('DELETE', `/stories/${id}`)
      navigate('/stories', { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  async function toggleLike() {
    try {
      setStory(await api('POST', `/stories/${id}/like`))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loadError)
    return (
      <div className="card empty">
        <div className="empty-emoji">🔍</div>
        <p>{loadError}</p>
        <Link to="/" className="btn btn-secondary">
          메인으로
        </Link>
      </div>
    )
  if (!story) return <Loading />

  return (
    <div className="stack">
      <Link to={story.is_mine ? '/stories' : '/'} className="back-link">
        ‹ {story.is_mine ? '내 기록으로' : '모두의 이야기로'}
      </Link>

      <article className="card story-detail">
        {editing ? (
          <form onSubmit={handleSave} className="edit-form">
            <label className="field">
              <span>제목</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
            </label>
            <label className="field">
              <span>본문</span>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={14} />
            </label>
            {error && <p className="error">{error}</p>}
            <div className="actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>
                취소
              </button>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="story-head">
              <h1 className="story-title">{story.title}</h1>
              <HeartButton liked={story.liked} count={story.like_count} onClick={toggleLike} />
            </div>
            <p className="meta">
              ✏️ {story.author_nickname} · {formatDate(story.created_at)}
              {story.updated_at !== story.created_at && ` · 수정됨 ${formatDate(story.updated_at)}`}
            </p>
            <p className="story-content">{story.content}</p>
            {error && <p className="error">{error}</p>}
            {story.is_mine && (
              <div className="actions detail-actions">
                <label className="toggle">
                  <input type="checkbox" checked={story.is_public} onChange={togglePublic} />
                  <span className="toggle-track" />
                  <span>{story.is_public ? '🌍 공개 중' : '🔒 비공개'}</span>
                </label>
                <div className="actions">
                  <button className="btn btn-danger" onClick={handleDelete}>
                    삭제
                  </button>
                  <button className="btn btn-secondary" onClick={startEdit}>
                    수정
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </article>
    </div>
  )
}
