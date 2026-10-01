import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import Pagination from './Pagination.jsx'
import { Loading } from './RouteGuards.jsx'
import StoryCard from './StoryCard.jsx'

// 페이지 단위로 스토리를 불러와 카드 그리드 + 페이지네이션으로 보여준다
export default function StoryGrid({ endpoint, page, onPageChange, refreshKey, showAuthor, showVisibility, renderHeader, empty }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setError('')
    api('GET', `${endpoint}?page=${page}`)
      .then((res) => {
        if (cancelled) return
        // 범위를 넘는 페이지면 마지막 페이지로
        if (res.total > 0 && page > res.total_pages) {
          onPageChange(res.total_pages, true)
          return
        }
        setData(res)
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [endpoint, page, refreshKey, onPageChange])

  const toggleLike = useCallback(async (id) => {
    try {
      const updated = await api('POST', `/stories/${id}/like`)
      setData((d) => ({ ...d, items: d.items.map((s) => (s.id === id ? updated : s)) }))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  return (
    <>
      {renderHeader(data)}
      {error && <p className="error card-error">{error}</p>}
      {!data && !error && <Loading />}
      {data && data.total === 0 && empty}
      {data && data.total > 0 && (
        <>
          <div className="grid">
            {data.items.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onToggleLike={toggleLike}
                showAuthor={showAuthor}
                showVisibility={showVisibility}
              />
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.total_pages} onChange={(p) => onPageChange(p)} />
        </>
      )}
    </>
  )
}
