import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Simulations } from './pages/Simulations'
import { Visualizations } from './pages/Visualizations'
import { Documentation } from './pages/Documentation'
import { Tools } from './pages/Tools'
import { Settings } from './pages/Settings'
import { SettingsProvider } from './settings'
import './App.css'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00bcd4',
    },
    secondary: {
      main: '#ff5722',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 300,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 300,
    },
  },
})

function App() {
  return (
    <SettingsProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/simulations" element={<Simulations />} />
              <Route path="/visualizations" element={<Visualizations />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </Router>
      </ThemeProvider>
    </SettingsProvider>
  )
}

export default App
