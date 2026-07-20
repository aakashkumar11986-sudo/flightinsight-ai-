import { useState } from 'react'
import LandingPage from './pages/LandingPage.jsx'
import UploadPage from './pages/UploadPage.jsx'
import MissionReport from './pages/MissionReport.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import BatteryDetailPage from './pages/BatteryDetailPage.jsx'
import GpsDetailPage from './pages/GpsDetailPage.jsx'

export default function App() {
  const [view, setView] = useState('landing') // landing | upload | report | history | settings | battery | gps
  const [flightId, setFlightId] = useState(null)

  const go = (v) => setView(v)

  if (view === 'landing') {
    return (
      <LandingPage
        onGo={() => go('upload')}
        onHistory={() => go('history')}
        onSettings={() => go('settings')}
      />
    )
  }
  if (view === 'upload') {
    return <UploadPage onDone={(id) => { setFlightId(id); go('report') }} />
  }
  if (view === 'report' && flightId) {
    return (
      <MissionReport
        flightId={flightId}
        onHome={() => go('landing')}
        onHistory={() => go('history')}
        onSettings={() => go('settings')}
        onBattery={() => go('battery')}
        onGps={() => go('gps')}
      />
    )
  }
  if (view === 'history') {
    return (
      <HistoryPage
        onOpenFlight={(id) => { setFlightId(id); go('report') }}
        onUpload={() => go('upload')}
        onSettings={() => go('settings')}
      />
    )
  }
  if (view === 'settings') {
    return (
      <SettingsPage
        onUpload={() => go('upload')}
        onHistory={() => go('history')}
      />
    )
  }
  if (view === 'battery' && flightId) {
    return (
      <BatteryDetailPage
        flightId={flightId}
        onBack={() => go('report')}
        onHome={() => go('landing')}
      />
    )
  }
  if (view === 'gps' && flightId) {
    return (
      <GpsDetailPage
        flightId={flightId}
        onBack={() => go('report')}
        onHome={() => go('landing')}
      />
    )
  }
  // fallback
  return (
    <LandingPage
      onGo={() => go('upload')}
      onHistory={() => go('history')}
      onSettings={() => go('settings')}
    />
  )
}
