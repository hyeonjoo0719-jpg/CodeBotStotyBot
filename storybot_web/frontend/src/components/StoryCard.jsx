import { Link } from 'react-router-dom'
import HeartButton from './HeartButton.jsx'
import { formatDate } from '../utils.js'

export default function StoryCard({ story, onToggleLike, showAuthor, showVisibility }) {
  return (
    <article className="card story-card">
      <div className="story-head">
        <Link to={`/stories/${story.id}`} className="story-card-title">
          {story.title}
        </Link>
        <HeartButton liked={story.liked} count={story.like_count} onClick={() => onToggleLike(story.id)} />
      </div>
      <Link to={`/stories/${story.id}`} className="story-preview">
        {story.content}
      </Link>
      <div className="card-foot">
        {showAuthor && (
          <span className="author">
            ✏️ {story.author_nickname}
            {story.is_mine && <span className="mine-badge">나</span>}
          </span>
        )}
        {showVisibility && (
          <span className={`visibility ${story.is_public ? 'public' : ''}`}>
            {story.is_public ? '🌍 공개' : '🔒 비공개'}
          </span>
        )}
        <time className="date">{formatDate(story.created_at)}</time>
      </div>
    </article>
  )
}
