export default function HeartButton({ liked, count, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`heart ${liked ? 'liked' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={liked}
      aria-label={liked ? '좋아요 취소' : '좋아요'}
      title={liked ? '좋아요 취소' : '좋아요'}
    >
      <span className="heart-icon">{liked ? '♥' : '♡'}</span>
      <span className="heart-count">{count}</span>
    </button>
  )
}
