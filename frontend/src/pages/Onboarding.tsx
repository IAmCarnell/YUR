import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Container,
  Stepper,
  Step,
  StepLabel,
  Avatar,
  TextField,
  Grid,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material'
import {
  PersonAdd,
  Interests,
  Settings,
  CheckCircle,
  CloudUpload,
  LocationOn,
  Work,
  School,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

const steps = ['Profile Setup', 'Interests', 'Privacy Settings']

export const Onboarding: React.FC = () => {
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(0)
  const [profileData, setProfileData] = useState({
    avatar: '',
    bio: '',
    location: '',
    occupation: '',
    education: '',
    website: '',
    interests: [] as string[],
    profilePublic: true,
    showEmail: false,
    showPhone: false,
    allowMessagesFromStrangers: true,
    showOnlineStatus: true,
  })

  const interestOptions = [
    'Technology', 'Music', 'Sports', 'Travel', 'Food', 'Art', 'Photography',
    'Gaming', 'Fashion', 'Fitness', 'Reading', 'Movies', 'Nature', 'Science',
    'Business', 'Health', 'Education', 'Politics', 'History', 'Cooking',
  ]

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // Complete onboarding
      completeOnboarding()
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1)
    }
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const completeOnboarding = () => {
    // Save onboarding data
    const existingUser = JSON.parse(localStorage.getItem('pitnik_user') || '{}')
    const updatedUser = { ...existingUser, ...profileData, onboardingComplete: true }
    localStorage.setItem('pitnik_user', JSON.stringify(updatedUser))
    navigate('/dashboard')
  }

  const toggleInterest = (interest: string) => {
    setProfileData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              Let's set up your profile
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Help others get to know you better
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sx={{ textAlign: 'center', mb: 2 }}>
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: '3rem',
                  }}
                >
                  {profileData.avatar ? (
                    <img src={profileData.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    'P'
                  )}
                </Avatar>
                <Button
                  variant="outlined"
                  startIcon={<CloudUpload />}
                  component="label"
                >
                  Upload Photo
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (e) => {
                          setProfileData(prev => ({ ...prev, avatar: e.target?.result as string }))
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </Button>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  multiline
                  rows={3}
                  placeholder="Tell us a bit about yourself..."
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  placeholder="City, Country"
                  value={profileData.location}
                  onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                  InputProps={{
                    startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Occupation"
                  placeholder="Your job title"
                  value={profileData.occupation}
                  onChange={(e) => setProfileData(prev => ({ ...prev, occupation: e.target.value }))}
                  InputProps={{
                    startAdornment: <Work sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Education"
                  placeholder="School or University"
                  value={profileData.education}
                  onChange={(e) => setProfileData(prev => ({ ...prev, education: e.target.value }))}
                  InputProps={{
                    startAdornment: <School sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Website"
                  placeholder="https://your-website.com"
                  value={profileData.website}
                  onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                />
              </Grid>
            </Grid>
          </Box>
        )

      case 1:
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              What are your interests?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Choose topics you're interested in to personalize your experience
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {interestOptions.map((interest) => (
                <Chip
                  key={interest}
                  label={interest}
                  onClick={() => toggleInterest(interest)}
                  color={profileData.interests.includes(interest) ? 'primary' : 'default'}
                  variant={profileData.interests.includes(interest) ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>

            {profileData.interests.length > 0 && (
              <Alert severity="info" sx={{ mt: 3 }}>
                You've selected {profileData.interests.length} interests. 
                You can always change these later in your settings.
              </Alert>
            )}
          </Box>
        )

      case 2:
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              Privacy Settings
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Control who can see your information and interact with you
            </Typography>

            <Stack spacing={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.profilePublic}
                    onChange={(e) => setProfileData(prev => ({ ...prev, profilePublic: e.target.checked }))}
                  />
                }
                label="Make my profile public"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.showEmail}
                    onChange={(e) => setProfileData(prev => ({ ...prev, showEmail: e.target.checked }))}
                  />
                }
                label="Show my email address"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.showPhone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, showPhone: e.target.checked }))}
                  />
                }
                label="Show my phone number"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.allowMessagesFromStrangers}
                    onChange={(e) => setProfileData(prev => ({ ...prev, allowMessagesFromStrangers: e.target.checked }))}
                  />
                }
                label="Allow messages from people I don't know"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={profileData.showOnlineStatus}
                    onChange={(e) => setProfileData(prev => ({ ...prev, showOnlineStatus: e.target.checked }))}
                  />
                }
                label="Show when I'm online"
              />
            </Stack>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
          marginBottom: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom>
          Welcome to Pitnik!
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
          Let's get you set up in just a few steps
        </Typography>

        <Card sx={{ width: '100%', mt: 1 }}>
          <CardContent sx={{ p: 4 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label, index) => {
                const stepProps: { completed?: boolean } = {}
                const labelProps: { optional?: React.ReactNode } = {}

                return (
                  <Step key={label} {...stepProps}>
                    <StepLabel {...labelProps}>{label}</StepLabel>
                  </Step>
                )
              })}
            </Stepper>

            {renderStepContent(activeStep)}

            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 4 }}>
              <Button
                color="inherit"
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{ mr: 1 }}
              >
                Back
              </Button>
              <Box sx={{ flex: '1 1 auto' }} />
              <Button onClick={handleNext} variant="contained">
                {activeStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}