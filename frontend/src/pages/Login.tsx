import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Container,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Stack,
  Avatar,
} from '@mui/material'
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Google,
  Facebook,
  Twitter,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Simulate login API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // For demo purposes, accept any email/password
      if (formData.email && formData.password) {
        localStorage.setItem('pitnik_token', 'demo_token_123')
        localStorage.setItem('pitnik_user', JSON.stringify({
          id: 1,
          name: 'Demo User',
          email: formData.email,
          avatar: '',
        }))
        navigate('/dashboard')
      } else {
        setError('Please fill in all fields')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = (provider: string) => {
    console.log(`Social login with ${provider}`)
    // For demo purposes, redirect to dashboard
    localStorage.setItem('pitnik_token', 'demo_token_123')
    localStorage.setItem('pitnik_user', JSON.stringify({
      id: 1,
      name: `Demo User (${provider})`,
      email: `demo@${provider.toLowerCase()}.com`,
      avatar: '',
    }))
    navigate('/dashboard')
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'primary.main', width: 56, height: 56 }}>
          <Typography variant="h4">P</Typography>
        </Avatar>
        <Typography component="h1" variant="h4" gutterBottom>
          Welcome Back to Pitnik
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          Sign in to your account to continue
        </Typography>

        <Card sx={{ width: '100%', mt: 1 }}>
          <CardContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ mb: 2, py: 1.5 }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate('/forgot-password')
                  }}
                >
                  Forgot password?
                </Link>
              </Box>

              <Divider sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Or continue with
                </Typography>
              </Divider>

              <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Google />}
                  onClick={() => handleSocialLogin('Google')}
                >
                  Google
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Facebook />}
                  onClick={() => handleSocialLogin('Facebook')}
                >
                  Facebook
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Twitter />}
                  onClick={() => handleSocialLogin('Twitter')}
                >
                  Twitter
                </Button>
              </Stack>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">
                  Don't have an account?{' '}
                  <Link
                    component="button"
                    variant="body2"
                    onClick={(e) => {
                      e.preventDefault()
                      navigate('/signup')
                    }}
                  >
                    Sign up here
                  </Link>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}