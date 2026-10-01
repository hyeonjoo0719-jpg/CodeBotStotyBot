import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

export default function NavBar() {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="logo">
          <span className="logo-icon">📖</span> StoryBot
        </NavLink>
        {token && (
          <>
            <nav className="nav-links">
              <NavLink to="/" end>만들기</NavLink>
              <NavLink to="/stories">내 기록</NavLink>
              <NavLink to="/me">내 정보</NavLink>
            </nav>
            <div className="nav-user">
              {user && <span className="nickname">{user.nickname}님</span>}
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
