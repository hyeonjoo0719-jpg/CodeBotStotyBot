import { Navigate, Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Create from './pages/Create.jsx'
import StoryList from './pages/StoryList.jsx'
import StoryDetail from './pages/StoryDetail.jsx'
import Profile from './pages/Profile.jsx'

export default function App() {
  return (
    <>
      <NavBar />
      <main className="container">
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Create />} />
            <Route path="/stories" element={<StoryList />} />
            <Route path="/stories/:id" element={<StoryDetail />} />
            <Route path="/me" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}
