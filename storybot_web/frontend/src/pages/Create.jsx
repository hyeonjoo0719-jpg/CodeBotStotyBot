import { useCallback, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import HeartButton from '../components/HeartButton.jsx'
import { Loading } from '../components/RouteGuards.jsx'
import StoryGrid from '../components/StoryGrid.jsx'

const EXAMPLES = ['Once upon a time', 'One sunny day, a little dog', 'There was a girl named Lily']

export default function Create() {
  const [prompt, setPrompt] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [story, setStory] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedRefresh, setFeedRefresh] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const feedPage = Math.max(1, Number(searchParams.get('page')) || 1)
  const feedRef = useRef(null)

  const goToFeedPage = useCallback(
    (p, replace = false) => {
      setSearchParams({ page: String(p) }, { replace })
      if (!replace) feedRef.current?.scrollIntoView({ behavior: 'smooth' })
    },
    [setSearchParams],
  )

  async function handleGenerate(e) {
    e.preventDefault()
    setError('')
    setStory(null)
    setLoading(true)
    try {
      const created = await api('POST', '/stories', { prompt, is_public: isPublic })
      setStory(created)
      if (created.is_public) setFeedRefresh((n) => n + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleLike() {
    try {
      setStory(await api('POST', `/stories/${story.id}/like`))
      if (story.is_public) setFeedRefresh((n) => n + 1)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="stack">
      <section className="card hero">
        <h1 className="title">✨ 어떤 이야기를 시작해 볼까요?</h1>
        <p className="subtitle">영어로 시작 문장을 적으면 스토리봇이 뒷이야기를 이어 줘요</p>

        <form onSubmit={handleGenerate}>
          <textarea
            className="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Once upon a time..."
            rows={3}
          />
          <div className="chips">
            {EXAMPLES.map((ex) => (
              <button type="button" key={ex} className="chip" onClick={() => setPrompt(ex)}>
                {ex}
              </button>
            ))}
          </div>
          <div className="create-actions">
            <label className="toggle">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              <span className="toggle-track" />
              <span>{isPublic ? '🌍 모두에게 공개' : '🔒 나만 보기'}</span>
            </label>
            <button className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? '이야기 만드는 중...' : '이야기 만들기'}
            </button>
          </div>
        </form>
        <p className="hint">시작 문장은 최대 56토큰(대략 영어 40단어)까지 쓸 수 있어요.</p>
      </section>

      {error && <p className="error card-error">{error}</p>}
      {loading && <Loading text="스토리봇이 이야기를 쓰고 있어요..." />}

      {story && (
        <article className="card story-result">
          <div className="story-head">
            <h2 className="story-title">{story.title}</h2>
            <HeartButton liked={story.liked} count={story.like_count} onClick={toggleLike} />
          </div>
          <p className="story-content">{story.content}</p>
          <div className="story-foot">
            <span className="saved-badge">
              💾 내 기록에 저장되었어요 · {story.is_public ? '🌍 공개' : '🔒 비공개'}
            </span>
            <Link to={`/stories/${story.id}`} className="btn btn-secondary btn-sm">
              자세히 보기
            </Link>
          </div>
        </article>
      )}

      <section className="stack feed" ref={feedRef}>
        <StoryGrid
          endpoint="/stories/feed"
          page={feedPage}
          onPageChange={goToFeedPage}
          refreshKey={feedRefresh}
          showAuthor
          renderHeader={(data) => (
            <div className="page-head">
              <h2 className="title">🌈 모두의 이야기</h2>
              {data && <span className="count-badge">총 {data.total}편</span>}
            </div>
          )}
          empty={
            <div className="card empty">
              <div className="empty-emoji">🌱</div>
              <p>아직 공개된 이야기가 없어요. 첫 번째로 공개해 보세요!</p>
            </div>
          }
        />
      </section>
    </div>
  )
}
