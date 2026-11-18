import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Assistant } from './pages/Assistant'
import { Dashboard } from './pages/Dashboard'
import { Evaluation } from './pages/Evaluation'
import { KnowledgeBase } from './pages/KnowledgeBase'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="knowledge-base" element={<KnowledgeBase />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="evaluation" element={<Evaluation />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
