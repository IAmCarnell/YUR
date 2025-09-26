# Multi-User Collaboration System

## Overview

Real-time collaborative spatial workspace enabling multiple users to interact simultaneously in shared 3D environments with synchronized data, presence awareness, and collaborative tools.

## Architecture

```
collaboration/
├── workspace/           # Shared spatial workspace management
├── real-time/          # Real-time synchronization and communication
└── sync/               # Data synchronization and conflict resolution
```

## Core Features

### Shared Spatial Workspace
- Multi-user 3D environments
- Synchronized mandala navigation
- Shared scientific computations
- Collaborative document editing
- Persistent spatial anchors

### Real-time Communication
- WebRTC peer-to-peer connections
- WebSocket server coordination
- Voice and video integration
- Spatial audio positioning
- Screen sharing capabilities

## Workspace Management

### Collaborative Workspace

```typescript
// workspace/collaborative-workspace.ts
export class CollaborativeWorkspace {
  private participants: Map<string, Participant> = new Map();
  private sharedObjects: Map<string, SharedObject> = new Map();
  private spatialAnchors: Map<string, SpatialAnchor> = new Map();
  private syncManager: SyncManager;

  constructor(workspaceId: string, hostUserId: string) {
    this.workspaceId = workspaceId;
    this.hostUserId = hostUserId;
    this.syncManager = new SyncManager(workspaceId);
    this.setupEventHandlers();
  }

  async createWorkspace(config: WorkspaceConfig): Promise<Workspace> {
    const workspace = {
      id: this.workspaceId,
      name: config.name,
      description: config.description,
      hostId: this.hostUserId,
      created: new Date(),
      settings: {
        maxParticipants: config.maxParticipants || 10,
        isPublic: config.isPublic || false,
        allowGuests: config.allowGuests || false,
        spatialAudio: config.spatialAudio || true,
        permissions: config.permissions || this.getDefaultPermissions()
      }
    };

    await this.saveWorkspace(workspace);
    return workspace;
  }

  async joinWorkspace(userId: string, userInfo: UserInfo): Promise<boolean> {
    try {
      // Validate user permissions
      if (!await this.canUserJoin(userId)) {
        throw new Error('User not authorized to join workspace');
      }

      // Create participant
      const participant: Participant = {
        id: userId,
        name: userInfo.name,
        avatar: userInfo.avatar,
        joinedAt: new Date(),
        position: this.getDefaultPosition(),
        cursor: { x: 0, y: 0, z: 0 },
        activeTools: [],
        permissions: await this.getUserPermissions(userId)
      };

      this.participants.set(userId, participant);

      // Broadcast participant joined
      this.broadcastEvent({
        type: 'participant_joined',
        participant,
        timestamp: Date.now()
      });

      // Send workspace state to new participant
      await this.sendWorkspaceState(userId);

      return true;
    } catch (error) {
      console.error('Failed to join workspace:', error);
      return false;
    }
  }

  async leaveWorkspace(userId: string): Promise<void> {
    const participant = this.participants.get(userId);
    if (!participant) return;

    // Clean up participant's objects
    await this.cleanupParticipantObjects(userId);

    // Remove participant
    this.participants.delete(userId);

    // Broadcast participant left
    this.broadcastEvent({
      type: 'participant_left',
      participantId: userId,
      timestamp: Date.now()
    });
  }

  updateParticipantPosition(userId: string, position: Vector3, rotation: Quaternion): void {
    const participant = this.participants.get(userId);
    if (!participant) return;

    participant.position = position;
    participant.rotation = rotation;
    participant.lastUpdate = Date.now();

    // Broadcast position update
    this.broadcastEvent({
      type: 'participant_moved',
      participantId: userId,
      position,
      rotation,
      timestamp: Date.now()
    }, [userId]); // Exclude sender
  }

  async createSharedObject(creatorId: string, objectData: SharedObjectData): Promise<string> {
    const objectId = this.generateObjectId();
    
    const sharedObject: SharedObject = {
      id: objectId,
      type: objectData.type,
      data: objectData.data,
      position: objectData.position,
      rotation: objectData.rotation,
      scale: objectData.scale,
      creatorId,
      created: new Date(),
      lastModified: new Date(),
      permissions: objectData.permissions || ['read', 'write']
    };

    this.sharedObjects.set(objectId, sharedObject);

    // Broadcast object creation
    this.broadcastEvent({
      type: 'object_created',
      object: sharedObject,
      timestamp: Date.now()
    });

    return objectId;
  }

  updateSharedObject(userId: string, objectId: string, updates: Partial<SharedObjectData>): void {
    const object = this.sharedObjects.get(objectId);
    if (!object) return;

    // Check permissions
    if (!this.canUserModifyObject(userId, object)) {
      console.warn(`User ${userId} attempted to modify object ${objectId} without permission`);
      return;
    }

    // Apply updates
    Object.assign(object, updates, {
      lastModified: new Date(),
      lastModifiedBy: userId
    });

    // Broadcast update
    this.broadcastEvent({
      type: 'object_updated',
      objectId,
      updates,
      modifiedBy: userId,
      timestamp: Date.now()
    });
  }

  private async sendWorkspaceState(userId: string): Promise<void> {
    const workspaceState = {
      participants: Array.from(this.participants.values()),
      sharedObjects: Array.from(this.sharedObjects.values()),
      spatialAnchors: Array.from(this.spatialAnchors.values()),
      settings: this.settings
    };

    await this.sendToParticipant(userId, {
      type: 'workspace_state',
      state: workspaceState,
      timestamp: Date.now()
    });
  }
}
```

### Presence Awareness

```typescript
// workspace/presence-manager.ts
export class PresenceManager {
  private presenceData: Map<string, PresenceInfo> = new Map();
  private cursorSystem: CursorSystem;
  private avatarSystem: AvatarSystem;

  constructor() {
    this.cursorSystem = new CursorSystem();
    this.avatarSystem = new AvatarSystem();
  }

  updatePresence(userId: string, presence: PresenceUpdate): void {
    const currentPresence = this.presenceData.get(userId) || this.createDefaultPresence(userId);
    
    const updatedPresence: PresenceInfo = {
      ...currentPresence,
      ...presence,
      lastUpdate: Date.now()
    };

    this.presenceData.set(userId, updatedPresence);

    // Update visual indicators
    this.updateVisualPresence(userId, updatedPresence);

    // Broadcast presence update
    this.broadcastPresenceUpdate(userId, updatedPresence);
  }

  private updateVisualPresence(userId: string, presence: PresenceInfo): void {
    // Update cursor position
    if (presence.cursor) {
      this.cursorSystem.updateCursor(userId, presence.cursor);
    }

    // Update avatar position and state
    if (presence.position) {
      this.avatarSystem.updateAvatar(userId, {
        position: presence.position,
        rotation: presence.rotation,
        animation: presence.currentActivity
      });
    }

    // Update tool indicators
    if (presence.activeTool) {
      this.showToolIndicator(userId, presence.activeTool);
    }
  }

  getParticipantsBounds(): BoundingBox {
    const positions = Array.from(this.presenceData.values())
      .map(p => p.position)
      .filter(Boolean);

    if (positions.length === 0) {
      return { min: { x: -10, y: -10, z: -10 }, max: { x: 10, y: 10, z: 10 } };
    }

    return {
      min: {
        x: Math.min(...positions.map(p => p.x)),
        y: Math.min(...positions.map(p => p.y)),
        z: Math.min(...positions.map(p => p.z))
      },
      max: {
        x: Math.max(...positions.map(p => p.x)),
        y: Math.max(...positions.map(p => p.y)),
        z: Math.max(...positions.map(p => p.z))
      }
    };
  }

  createSpatialAwareness(): SpatialAwarenessData {
    const participants = Array.from(this.presenceData.values());
    
    return {
      nearbyParticipants: this.findNearbyParticipants(),
      groupClusters: this.identifyGroupClusters(participants),
      focusAreas: this.identifyFocusAreas(participants),
      collaborationOpportunities: this.suggestCollaborationOpportunities(participants)
    };
  }

  private findNearbyParticipants(radius: number = 5): NearbyParticipant[] {
    const nearby: NearbyParticipant[] = [];
    const participants = Array.from(this.presenceData.entries());

    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const [userId1, presence1] = participants[i];
        const [userId2, presence2] = participants[j];

        if (presence1.position && presence2.position) {
          const distance = this.calculateDistance(presence1.position, presence2.position);
          if (distance <= radius) {
            nearby.push({
              user1: userId1,
              user2: userId2,
              distance,
              sharedContext: this.getSharedContext(presence1, presence2)
            });
          }
        }
      }
    }

    return nearby;
  }
}
```

## Real-time Synchronization

### WebRTC Communication

```typescript
// real-time/webrtc-manager.ts
export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private mediaStreams: Map<string, MediaStream> = new Map();

  async establishConnection(remoteUserId: string, isInitiator: boolean): Promise<void> {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
      ]
    };

    const peerConnection = new RTCPeerConnection(config);
    this.peerConnections.set(remoteUserId, peerConnection);

    // Set up event handlers
    this.setupPeerConnectionHandlers(remoteUserId, peerConnection);

    if (isInitiator) {
      // Create data channel for real-time collaboration data
      const dataChannel = peerConnection.createDataChannel('collaboration', {
        ordered: false, // For real-time position updates
        maxRetransmits: 0
      });
      
      this.setupDataChannelHandlers(remoteUserId, dataChannel);
      this.dataChannels.set(remoteUserId, dataChannel);

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      // Send offer through signaling server
      await this.sendSignalingMessage(remoteUserId, {
        type: 'offer',
        sdp: offer
      });
    }
  }

  async handleOffer(remoteUserId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = this.peerConnections.get(remoteUserId);
    if (!peerConnection) return;

    await peerConnection.setRemoteDescription(offer);
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    // Send answer through signaling server
    await this.sendSignalingMessage(remoteUserId, {
      type: 'answer',
      sdp: answer
    });
  }

  async handleAnswer(remoteUserId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = this.peerConnections.get(remoteUserId);
    if (!peerConnection) return;

    await peerConnection.setRemoteDescription(answer);
  }

  sendCollaborationData(remoteUserId: string, data: CollaborationMessage): void {
    const dataChannel = this.dataChannels.get(remoteUserId);
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(data));
    }
  }

  broadcastCollaborationData(data: CollaborationMessage, excludeUsers: string[] = []): void {
    this.dataChannels.forEach((channel, userId) => {
      if (!excludeUsers.includes(userId) && channel.readyState === 'open') {
        channel.send(JSON.stringify(data));
      }
    });
  }

  private setupDataChannelHandlers(remoteUserId: string, dataChannel: RTCDataChannel): void {
    dataChannel.onopen = () => {
      console.log(`Data channel opened with ${remoteUserId}`);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message: CollaborationMessage = JSON.parse(event.data);
        this.handleCollaborationMessage(remoteUserId, message);
      } catch (error) {
        console.error('Failed to parse collaboration message:', error);
      }
    };

    dataChannel.onclose = () => {
      console.log(`Data channel closed with ${remoteUserId}`);
      this.dataChannels.delete(remoteUserId);
    };
  }

  private handleCollaborationMessage(senderId: string, message: CollaborationMessage): void {
    switch (message.type) {
      case 'position_update':
        this.onPositionUpdate(senderId, message.data);
        break;
      case 'object_manipulation':
        this.onObjectManipulation(senderId, message.data);
        break;
      case 'cursor_move':
        this.onCursorMove(senderId, message.data);
        break;
      case 'voice_activity':
        this.onVoiceActivity(senderId, message.data);
        break;
    }
  }
}
```

### Voice and Video Integration

```typescript
// real-time/media-manager.ts
export class MediaManager {
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();
  private spatialAudio: SpatialAudioProcessor;

  constructor() {
    this.spatialAudio = new SpatialAudioProcessor();
  }

  async initializeLocalMedia(options: MediaOptions): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...options.audio
        },
        video: options.video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          ...options.video
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Set up spatial audio processing
      if (options.spatialAudio) {
        await this.spatialAudio.processLocalStream(this.localStream);
      }

      return this.localStream;
    } catch (error) {
      console.error('Failed to initialize local media:', error);
      throw error;
    }
  }

  addRemoteStream(userId: string, stream: MediaStream): void {
    this.remoteStreams.set(userId, stream);
    
    // Set up spatial audio for remote stream
    this.spatialAudio.addRemoteStream(userId, stream);
    
    // Emit event for UI updates
    this.emit('remote_stream_added', { userId, stream });
  }

  updateSpatialAudioPosition(userId: string, position: Vector3): void {
    this.spatialAudio.updatePosition(userId, position);
  }

  setListenerPosition(position: Vector3, orientation: Vector3): void {
    this.spatialAudio.updateListener(position, orientation);
  }

  async enableScreenShare(): Promise<MediaStream> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true
      });

      // Replace video track in existing peer connections
      this.replaceVideoTrack(screenStream.getVideoTracks()[0]);

      return screenStream;
    } catch (error) {
      console.error('Failed to enable screen sharing:', error);
      throw error;
    }
  }

  private replaceVideoTrack(newTrack: MediaStreamTrack): void {
    this.peerConnections.forEach(async (connection, userId) => {
      const sender = connection.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );
      
      if (sender) {
        await sender.replaceTrack(newTrack);
      }
    });
  }
}
```

## Data Synchronization

### Conflict Resolution

```typescript
// sync/conflict-resolver.ts
export class ConflictResolver {
  resolveConflict(localChange: Change, remoteChange: Change): Resolution {
    // Determine conflict type
    const conflictType = this.identifyConflictType(localChange, remoteChange);
    
    switch (conflictType) {
      case 'concurrent_edit':
        return this.resolveConcurrentEdit(localChange, remoteChange);
      case 'move_conflict':
        return this.resolveMoveConflict(localChange, remoteChange);
      case 'delete_edit':
        return this.resolveDeleteEdit(localChange, remoteChange);
      case 'permission_conflict':
        return this.resolvePermissionConflict(localChange, remoteChange);
      default:
        return this.useLastWriterWins(localChange, remoteChange);
    }
  }

  private resolveConcurrentEdit(local: Change, remote: Change): Resolution {
    // For text editing, use operational transformation
    if (local.type === 'text_edit' && remote.type === 'text_edit') {
      return this.applyOperationalTransformation(local, remote);
    }
    
    // For spatial objects, use position-based merging
    if (local.type === 'object_transform' && remote.type === 'object_transform') {
      return this.mergeSpatialTransforms(local, remote);
    }
    
    // Default to timestamp-based resolution
    return local.timestamp > remote.timestamp ? 
      { winner: 'local', merged: local } : 
      { winner: 'remote', merged: remote };
  }

  private applyOperationalTransformation(local: TextEdit, remote: TextEdit): Resolution {
    // Implement operational transformation for concurrent text edits
    const transformer = new OperationalTransformer();
    const transformed = transformer.transform(local.operation, remote.operation);
    
    return {
      winner: 'merged',
      merged: {
        type: 'text_edit',
        operations: transformed,
        timestamp: Math.max(local.timestamp, remote.timestamp)
      }
    };
  }

  private mergeSpatialTransforms(local: SpatialTransform, remote: SpatialTransform): Resolution {
    // For spatial objects, interpolate between conflicting transforms
    const mergedTransform: SpatialTransform = {
      type: 'object_transform',
      objectId: local.objectId,
      position: this.interpolateVector3(local.position, remote.position, 0.5),
      rotation: this.interpolateQuaternion(local.rotation, remote.rotation, 0.5),
      scale: this.interpolateVector3(local.scale, remote.scale, 0.5),
      timestamp: Math.max(local.timestamp, remote.timestamp)
    };

    return {
      winner: 'merged',
      merged: mergedTransform
    };
  }
}
```

### Change Tracking and Synchronization

```typescript
// sync/sync-manager.ts
export class SyncManager {
  private changeLog: ChangeLog = new ChangeLog();
  private syncState: Map<string, SyncState> = new Map();
  private conflictResolver: ConflictResolver = new ConflictResolver();

  async synchronizeChanges(participantId: string, changes: Change[]): Promise<SyncResult> {
    const result: SyncResult = {
      applied: [],
      conflicts: [],
      rejected: []
    };

    for (const change of changes) {
      try {
        const syncResult = await this.synchronizeChange(participantId, change);
        
        if (syncResult.conflict) {
          result.conflicts.push({
            change,
            conflict: syncResult.conflict,
            resolution: syncResult.resolution
          });
        } else {
          result.applied.push(change);
        }
      } catch (error) {
        result.rejected.push({
          change,
          error: error.message
        });
      }
    }

    return result;
  }

  private async synchronizeChange(participantId: string, change: Change): Promise<ChangeResult> {
    // Check for conflicts with existing changes
    const conflicts = this.changeLog.findConflicts(change);
    
    if (conflicts.length === 0) {
      // No conflicts, apply change directly
      await this.applyChange(change);
      this.changeLog.addChange(change);
      
      return { success: true };
    }

    // Resolve conflicts
    const resolutions = conflicts.map(conflict => 
      this.conflictResolver.resolveConflict(change, conflict)
    );

    // Apply resolved changes
    for (const resolution of resolutions) {
      await this.applyChange(resolution.merged);
      this.changeLog.addChange(resolution.merged);
    }

    return {
      success: true,
      conflict: conflicts[0],
      resolution: resolutions[0]
    };
  }

  createCheckpoint(): string {
    const checkpointId = this.generateCheckpointId();
    const state = this.captureCurrentState();
    
    this.changeLog.createCheckpoint(checkpointId, state);
    
    return checkpointId;
  }

  async rollbackToCheckpoint(checkpointId: string): Promise<boolean> {
    try {
      const checkpoint = this.changeLog.getCheckpoint(checkpointId);
      if (!checkpoint) return false;

      await this.restoreState(checkpoint.state);
      this.changeLog.rollbackTo(checkpointId);

      return true;
    } catch (error) {
      console.error('Failed to rollback to checkpoint:', error);
      return false;
    }
  }
}
```

## Integration Examples

### Scientific Collaboration

```typescript
// Integration with scientific computing
export class ScientificCollaboration {
  async shareSimulation(simulationId: string, participants: string[]): Promise<void> {
    const simulation = await this.getSimulation(simulationId);
    
    // Create shared computation context
    const sharedContext = await this.workspace.createSharedObject(this.userId, {
      type: 'scientific_simulation',
      data: {
        parameters: simulation.parameters,
        results: simulation.results,
        visualizations: simulation.visualizations
      },
      permissions: ['read', 'write', 'execute']
    });

    // Invite participants
    for (const participantId of participants) {
      await this.inviteToSimulation(participantId, sharedContext.id);
    }
  }

  async collaborativeComputation(params: ComputationParams): Promise<ComputationResult> {
    // Distribute computation across participants
    const participants = Array.from(this.workspace.getParticipants().keys());
    const chunks = this.distributeComputation(params, participants.length);
    
    // Execute computation chunks in parallel
    const results = await Promise.all(
      chunks.map((chunk, index) => 
        this.executeOnParticipant(participants[index], chunk)
      )
    );
    
    // Merge results
    return this.mergeComputationResults(results);
  }
}
```

### Spatial Collaboration

```typescript
// Integration with spatial computing
export class SpatialCollaboration {
  async createSharedMandala(): Promise<SharedMandala> {
    const mandala = await this.workspace.createSharedObject(this.userId, {
      type: 'mandala_workspace',
      data: {
        nodes: this.generateDefaultNodes(),
        connections: [],
        centerPosition: { x: 0, y: 0, z: 0 }
      },
      position: { x: 0, y: 1.5, z: -2 },
      permissions: ['read', 'write', 'navigate']
    });

    // Set up collaborative navigation
    this.setupCollaborativeNavigation(mandala.id);
    
    return mandala;
  }

  private setupCollaborativeNavigation(mandalaId: string): void {
    // Synchronize mandala rotations and zoom levels
    this.workspace.on('participant_moved', (event) => {
      if (event.context === mandalaId) {
        this.updateSharedMandalaView(event.participantId, event.viewState);
      }
    });
  }
}
```

## Configuration

### Collaboration Settings

```typescript
// collaboration.config.ts
export const collaborationConfig = {
  workspace: {
    maxParticipants: 10,
    defaultPermissions: ['read', 'write'],
    spatialBounds: {
      x: [-50, 50],
      y: [-10, 20],
      z: [-50, 50]
    },
    persistence: {
      enabled: true,
      saveInterval: 30000,
      autoSave: true
    }
  },
  realtime: {
    webrtc: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ],
      dataChannelConfig: {
        ordered: false,
        maxRetransmits: 0
      }
    },
    sync: {
      batchSize: 50,
      syncInterval: 100,
      conflictResolution: 'merge'
    }
  },
  media: {
    spatialAudio: true,
    videoQuality: 'medium',
    echoCancellation: true,
    noiseSuppression: true
  }
};
```

## Roadmap

### Current Features
- [x] Basic workspace management design
- [x] Real-time communication architecture
- [x] Conflict resolution framework
- [x] Presence awareness system

### Planned Features
- [ ] Advanced conflict resolution algorithms
- [ ] Machine learning-based collaboration suggestions
- [ ] Integration with blockchain for ownership
- [ ] Advanced spatial audio processing
- [ ] Mobile collaboration support
- [ ] Persistent world state management

## Contributing

Collaboration development requires:
- WebRTC and real-time communication experience
- Understanding of conflict resolution algorithms
- 3D spatial computing knowledge
- Experience with peer-to-peer networking
- Knowledge of collaborative editing systems

See [CONTRIBUTING.md](../CONTRIBUTING.md) for collaboration-specific guidelines.