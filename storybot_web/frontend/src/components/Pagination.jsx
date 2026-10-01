export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  // 현재 페이지 주변 최대 5개 번호만 보여준다
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  const pages = []
  for (let p = start; p <= end; p++) pages.push(p)

  return (
    <nav className="pagination" aria-label="페이지 이동">
      <button className="page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹ 이전
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={`page-btn ${p === page ? 'active' : ''}`}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      <button className="page-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        다음 ›
      </button>
    </nav>
  )
}
