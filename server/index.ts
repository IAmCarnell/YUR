/**
 * YUR Backend Server
 * 
 * Express server integrating the Agent Evolution System with REST API endpoints
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { AgentEvolutionEngine, MongoEvolutionStorage, demonstrateEvolution } from './agents/evolution';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize Evolution Engine
const storage = new MongoEvolutionStorage(MONGODB_URI);
const evolutionEngine = new AgentEvolutionEngine(storage);

// ===== API ROUTES =====

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Agent routes
app.post('/api/agents', async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    
    const agent = await evolutionEngine.createAgent(name, type);
    res.status(201).json(agent);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

app.get('/api/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = await evolutionEngine.getAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Convert Map to Object for JSON serialization
    const agentResponse = {
      ...agent,
      skills: Object.fromEntries(agent.skills)
    };
    
    res.json(agentResponse);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// Award experience
app.post('/api/agents/:agentId/experience', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { skillId, xp, source } = req.body;
    
    if (!skillId || !xp || !source) {
      return res.status(400).json({ error: 'skillId, xp, and source are required' });
    }
    
    const success = await evolutionEngine.awardExperience(agentId, skillId, xp, source);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to award experience' });
    }
    
    res.json({ success: true, message: 'Experience awarded successfully' });
  } catch (error) {
    console.error('Error awarding experience:', error);
    res.status(500).json({ error: 'Failed to award experience' });
  }
});

// Learning triggers
app.post('/api/agents/:agentId/collaboration', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { collaboratorId, context } = req.body;
    
    if (!collaboratorId || !context) {
      return res.status(400).json({ error: 'collaboratorId and context are required' });
    }
    
    await evolutionEngine.triggerCollaborationLearning(agentId, collaboratorId, context);
    res.json({ success: true, message: 'Collaboration learning triggered' });
  } catch (error) {
    console.error('Error triggering collaboration learning:', error);
    res.status(500).json({ error: 'Failed to trigger collaboration learning' });
  }
});

app.post('/api/agents/:agentId/terminal-learning', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { command, output, success } = req.body;
    
    if (!command || output === undefined || success === undefined) {
      return res.status(400).json({ error: 'command, output, and success are required' });
    }
    
    await evolutionEngine.triggerTerminalLearning(agentId, command, output, success);
    res.json({ success: true, message: 'Terminal learning triggered' });
  } catch (error) {
    console.error('Error triggering terminal learning:', error);
    res.status(500).json({ error: 'Failed to trigger terminal learning' });
  }
});

app.post('/api/agents/:agentId/feedback', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { feedback, rating } = req.body;
    
    if (!feedback || !rating) {
      return res.status(400).json({ error: 'feedback and rating are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }
    
    await evolutionEngine.triggerFeedbackLearning(agentId, feedback, rating);
    res.json({ success: true, message: 'Feedback learning triggered' });
  } catch (error) {
    console.error('Error triggering feedback learning:', error);
    res.status(500).json({ error: 'Failed to trigger feedback learning' });
  }
});

// Quest routes
app.post('/api/agents/:agentId/quests/:questId/start', async (req, res) => {
  try {
    const { agentId, questId } = req.params;
    
    const success = await evolutionEngine.startQuest(agentId, questId);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to start quest' });
    }
    
    res.json({ success: true, message: 'Quest started successfully' });
  } catch (error) {
    console.error('Error starting quest:', error);
    res.status(500).json({ error: 'Failed to start quest' });
  }
});

app.post('/api/agents/:agentId/quests/:questId/complete', async (req, res) => {
  try {
    const { agentId, questId } = req.params;
    
    const success = await evolutionEngine.completeQuest(agentId, questId);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to complete quest' });
    }
    
    res.json({ success: true, message: 'Quest completed successfully' });
  } catch (error) {
    console.error('Error completing quest:', error);
    res.status(500).json({ error: 'Failed to complete quest' });
  }
});

// Demo route
app.post('/api/demo/evolution', async (req, res) => {
  try {
    await demonstrateEvolution();
    res.json({ success: true, message: 'Evolution demonstration completed' });
  } catch (error) {
    console.error('Error running evolution demo:', error);
    res.status(500).json({ error: 'Failed to run evolution demo' });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`YUR Backend Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB URI: ${MONGODB_URI}`);
});

export default app;