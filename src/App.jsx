import { useState } from 'react'
import LandingPage from './pages/LandingPage.jsx'
import UploadPage from './pages/UploadPage.jsx'
import MissionReport from './pages/MissionReport.jsx'

export default function App() {
  const [view, setView] = useState('landing') // landing | upload | report
  const [flightId, setFlightId] = useState(null)

  if (view === 'landing') {
    return <LandingPage onGo={() => setView('upload')} />
  }
  if (view === 'upload') {
    return <UploadPage onDone={(id) => { setFlightId(id); setView('report') }} />
  }
  if (view === 'report' && flightId) {
    return <MissionReport flightId={flightId} onHome={() => setView('landing')} />
  }
  // fallback
  return <LandingPage onGo={() => setView('upload')} />
}
