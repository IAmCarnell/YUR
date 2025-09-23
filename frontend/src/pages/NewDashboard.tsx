import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  Stack,
  Divider,
  IconButton,
  Badge,
} from '@mui/material'
import {
  Timeline,
  People,
  VideoLibrary,
  Work,
  Favorite,
  ShoppingCart,
  Forum,
  Notifications,
  Message,
  TrendingUp,
  Event,
  PhotoLibrary,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = () => {
    try {
      const userData = localStorage.getItem('pitnik_user')
      if (userData) {
        setUser(JSON.parse(userData))
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const socialFeatures = [
    {
      title: 'Newsfeed & Stories',
      description: 'Share updates, photos, and connect with friends through stories',
      icon: <Timeline sx={{ fontSize: 40 }} />,
      action: () => navigate('/newsfeed'),
      color: '#00bcd4',
      badge: 5,
    },
    {
      title: 'Friends & Community',
      description: 'Connect with friends, join groups, and build your network',
      icon: <People sx={{ fontSize: 40 }} />,
      action: () => navigate('/friends'),
      color: '#4caf50',
      badge: 12,
    },
    {
      title: 'PitTube Videos',
      description: 'Watch, upload, and share videos with the community',
      icon: <VideoLibrary sx={{ fontSize: 40 }} />,
      action: () => navigate('/pittube'),
      color: '#f44336',
      badge: 3,
    },
    {
      title: 'PitJob Opportunities',
      description: 'Find freelance work and career opportunities',
      icon: <Work sx={{ fontSize: 40 }} />,
      action: () => navigate('/pitjob'),
      color: '#ff9800',
      badge: 8,
    },
    {
      title: 'PitPoint Dating',
      description: 'Meet new people and find meaningful connections',
      icon: <Favorite sx={{ fontSize: 40 }} />,
      action: () => navigate('/pitpoint'),
      color: '#e91e63',
      badge: 2,
    },
    {
      title: 'Marketplace',
      description: 'Buy and sell items in your local community',
      icon: <ShoppingCart sx={{ fontSize: 40 }} />,
      action: () => navigate('/marketplace'),
      color: '#9c27b0',
      badge: 15,
    },
  ]

  const quickStats = [
    { label: 'Friends', value: '1,247', icon: <People /> },
    { label: 'Posts', value: '89', icon: <PhotoLibrary /> },
    { label: 'Videos', value: '23', icon: <VideoLibrary /> },
    { label: 'Events', value: '5', icon: <Event /> },
  ]

  const recentActivity = [
    { text: 'John liked your post', time: '2 hours ago', avatar: '/api/placeholder/32/32' },
    { text: 'New job posted in PitJob', time: '4 hours ago', avatar: '/api/placeholder/32/32' },
    { text: 'Sarah commented on your video', time: '6 hours ago', avatar: '/api/placeholder/32/32' },
    { text: 'You have a new match on PitPoint', time: '1 day ago', avatar: '/api/placeholder/32/32' },
  ]

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              src={user.avatar}
              sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}
            >
              {user.name?.charAt(0) || 'P'}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" gutterBottom>
              Welcome back, {user.name || 'User'}!
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Stay connected with your Pitnik community
            </Typography>
          </Grid>
          <Grid item>
            <Stack direction="row" spacing={1}>
              <IconButton color="primary">
                <Badge badgeContent={4} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
              <IconButton color="primary">
                <Badge badgeContent={2} color="error">
                  <Message />
                </Badge>
              </IconButton>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickStats.map((stat, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: 'primary.main', mb: 1 }}>
                  {stat.icon}
                </Box>
                <Typography variant="h4" color="primary">
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Features */}
      <Typography variant="h5" gutterBottom>
        Explore Pitnik
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {socialFeatures.map((feature, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) => theme.shadows[8],
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ color: feature.color, mr: 2 }}>
                    {feature.icon}
                  </Box>
                  {feature.badge && (
                    <Badge badgeContent={feature.badge} color="error" sx={{ ml: 'auto' }} />
                  )}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  variant="outlined"
                  onClick={feature.action}
                  fullWidth
                >
                  Explore
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Stack spacing={2}>
                {recentActivity.map((activity, index) => (
                  <Box key={index}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar src={activity.avatar} sx={{ width: 32, height: 32 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{activity.text}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {activity.time}
                        </Typography>
                      </Box>
                    </Box>
                    {index < recentActivity.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trending Topics
              </Typography>
              <Stack spacing={1}>
                <Chip 
                  label="#Technology" 
                  color="primary" 
                  size="small" 
                  icon={<TrendingUp />}
                />
                <Chip 
                  label="#PitJob" 
                  color="secondary" 
                  size="small" 
                  icon={<TrendingUp />}
                />
                <Chip 
                  label="#PitTube" 
                  color="primary" 
                  variant="outlined" 
                  size="small" 
                />
                <Chip 
                  label="#Marketplace" 
                  color="secondary" 
                  variant="outlined" 
                  size="small" 
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}