import React from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Container,
  Chip,
  Avatar,
  Stack,
  useTheme,
  alpha,
} from '@mui/material'
import {
  PlayArrow,
  People,
  Work,
  Favorite,
  Forum,
  ShoppingCart,
  VideoLibrary,
  AudioFile,
  Cloud,
  TrendingUp,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

export const Landing: React.FC = () => {
  const theme = useTheme()
  const navigate = useNavigate()

  const demoFeatures = [
    {
      title: 'Pitnik New Look',
      description: 'Modern social media experience with stories and posts',
      image: '/api/placeholder/400/300',
      icon: <People />,
      color: '#00bcd4',
      action: () => navigate('/newsfeed'),
    },
    {
      title: 'PitTube (Video Network)',
      description: 'Video sharing and streaming platform',
      image: '/api/placeholder/400/300',
      icon: <VideoLibrary />,
      color: '#f44336',
      action: () => navigate('/pittube'),
    },
    {
      title: 'PitJob (Freelance Jobs Portal)',
      description: 'Find and post freelance opportunities',
      image: '/api/placeholder/400/300',
      icon: <Work />,
      color: '#4caf50',
      action: () => navigate('/pitjob'),
    },
    {
      title: 'PitPoint (Dating Network)',
      description: 'Connect with people and find relationships',
      image: '/api/placeholder/400/300',
      icon: <Favorite />,
      color: '#e91e63',
      action: () => navigate('/pitpoint'),
    },
    {
      title: 'Audionik (Music Cloud)',
      description: 'Stream and share your favorite music',
      image: '/api/placeholder/400/300',
      icon: <AudioFile />,
      color: '#9c27b0',
      action: () => navigate('/audionik'),
    },
    {
      title: 'Shop Sell (E-Commerce)',
      description: 'Buy and sell products online',
      image: '/api/placeholder/400/300',
      icon: <ShoppingCart />,
      color: '#ff9800',
      action: () => navigate('/marketplace'),
    },
    {
      title: 'Forum',
      description: 'Discuss topics with the community',
      image: '/api/placeholder/400/300',
      icon: <Forum />,
      color: '#607d8b',
      action: () => navigate('/forum'),
    },
    {
      title: 'Weather Forecast',
      description: 'Get real-time weather updates',
      image: '/api/placeholder/400/300',
      icon: <Cloud />,
      color: '#2196f3',
      action: () => navigate('/weather'),
    },
  ]

  const features = [
    '24x7 Support',
    'Online Documentation', 
    'Free Updates Lifetime',
    'Fast Loading Time',
    'Light-weighted',
    'Clean Code',
    'Responsive Layout',
    'Ready to use demos',
    'Lots of widgets',
    '1000+ UI Components',
    'Font Icons',
    'Google Maps',
    'Twitter Feed Jquery',
    'Google Web Fonts',
    'Lightbox Gallery',
    'Chat App',
    'Calendar App',
    'Mail App',
    'Carousel',
    'Modals',
    'Data Table Plugin',
    'Form Validation',
  ]

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
          py: 8,
          mb: 6,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom>
                Welcome to{' '}
                <Box component="span" sx={{ color: 'primary.main' }}>
                  Pitnik
                </Box>
              </Typography>
              <Typography variant="h5" color="text.secondary" gutterBottom>
                The Ultimate Social Media Platform
              </Typography>
              <Typography variant="body1" sx={{ mb: 4, fontSize: '1.2rem' }}>
                Connect, share, and explore with Pitnik - featuring videos, jobs, dating, 
                marketplace, music streaming, and much more in one unified platform.
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/signup')}
                  sx={{ px: 4, py: 1.5 }}
                >
                  Get Started
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{ px: 4, py: 1.5 }}
                >
                  Sign In
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 400,
                }}
              >
                <Avatar
                  sx={{
                    width: 300,
                    height: 300,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    border: `4px solid ${theme.palette.primary.main}`,
                  }}
                >
                  <Typography variant="h2" color="primary">
                    P
                  </Typography>
                </Avatar>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Demo Features Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography variant="h3" textAlign="center" gutterBottom>
          Pitnik Demos
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          textAlign="center" 
          gutterBottom 
          sx={{ mb: 6 }}
        >
          Check our friendly user Demos!
        </Typography>

        <Grid container spacing={3}>
          {demoFeatures.map((demo, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                  },
                }}
                onClick={demo.action}
              >
                <CardMedia
                  sx={{
                    height: 200,
                    bgcolor: alpha(demo.color, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box sx={{ color: demo.color, fontSize: 60 }}>
                    {demo.icon}
                  </Box>
                </CardMedia>
                <CardContent>
                  <Typography variant="h6" gutterBottom noWrap>
                    {demo.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {demo.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Features Section */}
      <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" textAlign="center" gutterBottom>
            Unlimited Features
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            textAlign="center" 
            gutterBottom 
            sx={{ mb: 6 }}
          >
            Features list in the template has to offer!
          </Typography>

          <Grid container spacing={2}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                  <Box sx={{ mb: 1 }}>
                    <TrendingUp sx={{ fontSize: 32, color: 'primary.main' }} />
                  </Box>
                  <Typography variant="body1">{feature}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>
          Ready to Join Pitnik?
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
          Start connecting with friends, exploring content, and building your community today.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/signup')}
          sx={{ px: 6, py: 2, fontSize: '1.2rem' }}
        >
          Join Now - It's Free!
        </Button>
      </Container>
    </Box>
  )
}