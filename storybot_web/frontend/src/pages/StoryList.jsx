import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import StoryGrid from '../components/StoryGrid.jsx'

export default function StoryList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const goTo = useCallback(
    (p, replace = false) => {
      setSearchParams({ page: String(p) }, { replace })
      if (!replace) window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [setSearchParams],
  )

  return (
    <div className="stack">
      <StoryGrid
        endpoint="/stories"
        page={page}
        onPageChange={goTo}
        showVisibility
        renderHeader={(data) => (
          <div className="page-head">
            <h1 className="title">📚 내 이야기 기록</h1>
            {data && <span className="count-badge">총 {data.total}편</span>}
          </div>
        )}
        empty={
          <div className="card empty">
            <div className="empty-emoji">🐣</div>
            <p>아직 만든 이야기가 없어요.</p>
            <Link to="/" className="btn btn-primary">
              첫 이야기 만들기
            </Link>
          </div>
        }
      />
    </div>
  )
}
