import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <p style={{ color: 'red', textAlign: 'center', padding: '10px' }}>Guys! The backend is hosted on rander free plan so that frist time it will take 30-60 sec to load</p>
    <App />
  </StrictMode>,
)
