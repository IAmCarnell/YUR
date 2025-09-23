import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { Layout } from './components/Layout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/NewDashboard'
import { Newsfeed } from './pages/Newsfeed'
import { Simulations } from './pages/Simulations'
import { Visualizations } from './pages/Visualizations'
import { Documentation } from './pages/Documentation'
import { Tools } from './pages/Tools'
import './App.css'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          
          {/* Protected routes with layout */}
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/simulations" element={<Layout><Simulations /></Layout>} />
          <Route path="/visualizations" element={<Layout><Visualizations /></Layout>} />
          <Route path="/documentation" element={<Layout><Documentation /></Layout>} />
          <Route path="/tools" element={<Layout><Tools /></Layout>} />
          
          {/* Social media routes */}
          <Route path="/newsfeed" element={<Layout><Newsfeed /></Layout>} />
          <Route path="/friends" element={<Layout><Dashboard /></Layout>} />
          <Route path="/pittube" element={<Layout><Dashboard /></Layout>} />
          <Route path="/pitjob" element={<Layout><Dashboard /></Layout>} />
          <Route path="/pitpoint" element={<Layout><Dashboard /></Layout>} />
          <Route path="/marketplace" element={<Layout><Dashboard /></Layout>} />
          <Route path="/forum" element={<Layout><Dashboard /></Layout>} />
          <Route path="/audionik" element={<Layout><Dashboard /></Layout>} />
          <Route path="/weather" element={<Layout><Dashboard /></Layout>} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
