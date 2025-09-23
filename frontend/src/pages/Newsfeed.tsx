import React, { useState } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Avatar,
  IconButton,
  Button,
  TextField,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  Divider,
  Paper,
} from '@mui/material'
import {
  Favorite,
  FavoriteBorder,
  Comment,
  Share,
  MoreVert,
  Add,
  PhotoCamera,
  VideoCall,
  LocationOn,
  Send,
} from '@mui/icons-material'

interface Post {
  id: number
  author: {
    name: string
    avatar: string
    username: string
  }
  content: string
  image?: string
  video?: string
  timestamp: string
  likes: number
  comments: number
  shares: number
  liked: boolean
}

export const Newsfeed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([
    {
      id: 1,
      author: {
        name: 'John Doe',
        avatar: '/api/placeholder/40/40',
        username: 'johndoe',
      },
      content: 'Just finished my latest project! Excited to share it with everyone. Building amazing things with the Pitnik community! 🚀',
      image: '/api/placeholder/600/400',
      timestamp: '2 hours ago',
      likes: 24,
      comments: 8,
      shares: 3,
      liked: false,
    },
    {
      id: 2,
      author: {
        name: 'Sarah Wilson',
        avatar: '/api/placeholder/40/40',
        username: 'sarahw',
      },
      content: 'Beautiful sunset from my balcony today! Nature never ceases to amaze me. Hope everyone is having a wonderful day! 🌅',
      image: '/api/placeholder/600/400',
      timestamp: '4 hours ago',
      likes: 67,
      comments: 12,
      shares: 5,
      liked: true,
    },
    {
      id: 3,
      author: {
        name: 'Mike Chen',
        avatar: '/api/placeholder/40/40',
        username: 'mikechen',
      },
      content: 'Check out this amazing video I found on PitTube! The editing is incredible and the story is so inspiring. You guys should definitely watch it!',
      video: '/api/placeholder/600/400',
      timestamp: '6 hours ago',
      likes: 45,
      comments: 15,
      shares: 8,
      liked: false,
    },
  ])

  const [newPostOpen, setNewPostOpen] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')

  const handleLike = (postId: number) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            liked: !post.liked, 
            likes: post.liked ? post.likes - 1 : post.likes + 1 
          }
        : post
    ))
  }

  const handleCreatePost = () => {
    if (newPostContent.trim()) {
      const newPost: Post = {
        id: posts.length + 1,
        author: {
          name: 'You',
          avatar: '/api/placeholder/40/40',
          username: 'you',
        },
        content: newPostContent,
        timestamp: 'Just now',
        likes: 0,
        comments: 0,
        shares: 0,
        liked: false,
      }
      setPosts([newPost, ...posts])
      setNewPostContent('')
      setNewPostOpen(false)
    }
  }

  const stories = [
    { id: 1, name: 'Your Story', avatar: '/api/placeholder/60/60', isOwn: true },
    { id: 2, name: 'Alice', avatar: '/api/placeholder/60/60', isOwn: false },
    { id: 3, name: 'Bob', avatar: '/api/placeholder/60/60', isOwn: false },
    { id: 4, name: 'Carol', avatar: '/api/placeholder/60/60', isOwn: false },
    { id: 5, name: 'David', avatar: '/api/placeholder/60/60', isOwn: false },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Newsfeed
      </Typography>

      <Grid container spacing={3}>
        {/* Stories Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Stories
            </Typography>
            <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
              {stories.map((story) => (
                <Box key={story.id} sx={{ textAlign: 'center', minWidth: 80 }}>
                  <Avatar
                    src={story.avatar}
                    sx={{
                      width: 60,
                      height: 60,
                      mb: 1,
                      border: story.isOwn ? '2px dashed #ccc' : '3px solid #1976d2',
                      cursor: 'pointer',
                    }}
                  >
                    {story.isOwn && <Add />}
                  </Avatar>
                  <Typography variant="caption" display="block">
                    {story.name}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Create Post Section */}
        <Grid item xs={12}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src="/api/placeholder/40/40" />
                <TextField
                  fullWidth
                  placeholder="What's on your mind?"
                  variant="outlined"
                  onClick={() => setNewPostOpen(true)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '20px',
                    },
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
                <Button startIcon={<VideoCall />} color="inherit">
                  Live Video
                </Button>
                <Button startIcon={<PhotoCamera />} color="inherit">
                  Photo/Video
                </Button>
                <Button startIcon={<LocationOn />} color="inherit">
                  Check In
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Posts */}
        <Grid item xs={12}>
          <Stack spacing={3}>
            {posts.map((post) => (
              <Card key={post.id}>
                <CardHeader
                  avatar={<Avatar src={post.author.avatar}>{post.author.name[0]}</Avatar>}
                  action={
                    <IconButton>
                      <MoreVert />
                    </IconButton>
                  }
                  title={post.author.name}
                  subheader={`@${post.author.username} • ${post.timestamp}`}
                />
                <CardContent sx={{ pt: 0 }}>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {post.content}
                  </Typography>
                  {post.image && (
                    <Box
                      component="img"
                      src={post.image}
                      alt="Post content"
                      sx={{
                        width: '100%',
                        height: 'auto',
                        borderRadius: 1,
                        mb: 1,
                      }}
                    />
                  )}
                  {post.video && (
                    <Box
                      sx={{
                        width: '100%',
                        height: 300,
                        bgcolor: 'grey.200',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography color="text.secondary">Video Player</Typography>
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      startIcon={post.liked ? <Favorite /> : <FavoriteBorder />}
                      color={post.liked ? 'error' : 'inherit'}
                      onClick={() => handleLike(post.id)}
                    >
                      {post.likes}
                    </Button>
                    <Button startIcon={<Comment />} color="inherit">
                      {post.comments}
                    </Button>
                    <Button startIcon={<Share />} color="inherit">
                      {post.shares}
                    </Button>
                  </Box>
                </CardActions>
              </Card>
            ))}
          </Stack>
        </Grid>
      </Grid>

      {/* Create Post Dialog */}
      <Dialog open={newPostOpen} onClose={() => setNewPostOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Post</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Avatar src="/api/placeholder/40/40" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1">You</Typography>
              <Chip label="Public" size="small" />
            </Box>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="What's on your mind?"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<PhotoCamera />} variant="outlined" size="small">
              Photo
            </Button>
            <Button startIcon={<VideoCall />} variant="outlined" size="small">
              Video
            </Button>
            <Button startIcon={<LocationOn />} variant="outlined" size="small">
              Location
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewPostOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreatePost} 
            variant="contained"
            disabled={!newPostContent.trim()}
            startIcon={<Send />}
          >
            Post
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setNewPostOpen(true)}
      >
        <Add />
      </Fab>
    </Box>
  )
}