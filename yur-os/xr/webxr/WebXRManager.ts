/**
 * WebXR Manager for YUR OS
 * Comprehensive WebXR session management with device detection and feature support
 */

import { EventEmitter } from 'events';

interface WebXRSessionConfig {
  mode: 'immersive-vr' | 'immersive-ar' | 'inline';
  requiredFeatures?: string[];
  optionalFeatures?: string[];
  referenceSpace?: 'viewer' | 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';
}

interface WebXRDeviceCapabilities {
  supportsVR: boolean;
  supportsAR: boolean;
  supportsHandTracking: boolean;
  supportsEyeTracking: boolean;
  supportsPlaneDetection: boolean;
  supportsHitTest: boolean;
  supportsAnchors: boolean;
  supportsDepthSensing: boolean;
  supportedSessionModes: string[];
  supportedReferenceSpaces: string[];
}

interface WebXRSessionState {
  isActive: boolean;
  mode: string | null;
  referenceSpace: XRReferenceSpace | null;
  inputSources: XRInputSource[];
  environmentBlendMode: string;
  interactionMode: string;
  visibilityState: string;
}

interface HandTrackingData {
  left?: {
    joints: { [jointName: string]: XRJointPose };
    handedness: 'left';
    confidence: number;
  };
  right?: {
    joints: { [jointName: string]: XRJointPose };
    handedness: 'right';
    confidence: number;
  };
}

interface XRControllerState {
  id: string;
  handedness: 'left' | 'right' | 'none';
  targetRayMode: 'gaze' | 'tracked-pointer' | 'screen';
  profiles: string[];
  position?: DOMPointReadOnly;
  orientation?: DOMPointReadOnly;
  buttons: { [index: number]: { pressed: boolean; touched: boolean; value: number } };
  axes: number[];
}

export class WebXRManager extends EventEmitter {
  private session: XRSession | null = null;
  private sessionState: WebXRSessionState = {
    isActive: false,
    mode: null,
    referenceSpace: null,
    inputSources: [],
    environmentBlendMode: 'opaque',
    interactionMode: 'screen-space',
    visibilityState: 'visible',
  };
  
  private capabilities: WebXRDeviceCapabilities = {
    supportsVR: false,
    supportsAR: false,
    supportsHandTracking: false,
    supportsEyeTracking: false,
    supportsPlaneDetection: false,
    supportsHitTest: false,
    supportsAnchors: false,
    supportsDepthSensing: false,
    supportedSessionModes: [],
    supportedReferenceSpaces: [],
  };

  private animationFrameId: number | null = null;
  private controllers: Map<string, XRControllerState> = new Map();
  private handTracking: HandTrackingData = {};
  private hitTestSources: XRHitTestSource[] = [];
  private anchors: Set<XRAnchor> = new Set();

  constructor() {
    super();
    this.initialize();
  }

  /**
   * Initialize WebXR and detect device capabilities
   */
  private async initialize(): Promise<void> {
    if (!('xr' in navigator)) {
      console.warn('WebXR not supported in this browser');
      this.emit('error', new Error('WebXR not supported'));
      return;
    }

    try {
      // Check VR support
      this.capabilities.supportsVR = await navigator.xr!.isSessionSupported('immersive-vr');
      
      // Check AR support
      this.capabilities.supportsAR = await navigator.xr!.isSessionSupported('immersive-ar');
      
      // Detect supported session modes
      const sessionModes = ['immersive-vr', 'immersive-ar', 'inline'];
      for (const mode of sessionModes) {
        if (await navigator.xr!.isSessionSupported(mode as XRSessionMode)) {
          this.capabilities.supportedSessionModes.push(mode);
        }
      }

      // Check optional features
      await this.detectOptionalFeatures();

      this.emit('initialized', this.capabilities);
      console.log('WebXR initialized with capabilities:', this.capabilities);
    } catch (error) {
      console.error('WebXR initialization failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Detect optional WebXR features
   */
  private async detectOptionalFeatures(): Promise<void> {
    const features = [
      'hand-tracking',
      'hit-test',
      'anchors',
      'plane-detection',
      'depth-sensing',
      'eye-tracking',
    ];

    for (const feature of features) {
      try {
        // Try to request a session with this feature to test support
        if (this.capabilities.supportsVR) {
          const session = await navigator.xr!.requestSession('immersive-vr', {
            optionalFeatures: [feature],
          });
          
          // Feature is supported if session creation succeeds
          switch (feature) {
            case 'hand-tracking':
              this.capabilities.supportsHandTracking = true;
              break;
            case 'hit-test':
              this.capabilities.supportsHitTest = true;
              break;
            case 'anchors':
              this.capabilities.supportsAnchors = true;
              break;
            case 'plane-detection':
              this.capabilities.supportsPlaneDetection = true;
              break;
            case 'depth-sensing':
              this.capabilities.supportsDepthSensing = true;
              break;
            case 'eye-tracking':
              this.capabilities.supportsEyeTracking = true;
              break;
          }
          
          session.end();
        }
      } catch (error) {
        // Feature not supported, continue
        console.log(`Feature ${feature} not supported`);
      }
    }
  }

  /**
   * Request a WebXR session
   */
  public async requestSession(config: WebXRSessionConfig): Promise<XRSession> {
    if (!navigator.xr) {
      throw new Error('WebXR not available');
    }

    if (this.session) {
      throw new Error('Session already active');
    }

    try {
      const sessionInit: XRSessionInit = {};
      
      if (config.requiredFeatures) {
        sessionInit.requiredFeatures = config.requiredFeatures;
      }
      
      if (config.optionalFeatures) {
        sessionInit.optionalFeatures = config.optionalFeatures;
      }

      this.session = await navigator.xr.requestSession(config.mode, sessionInit);
      
      // Set up session event listeners
      this.setupSessionEventListeners();
      
      // Initialize reference space
      if (config.referenceSpace) {
        this.sessionState.referenceSpace = await this.session.requestReferenceSpace(config.referenceSpace);
      }

      // Initialize input sources
      await this.initializeInputSources();

      // Set up hit test if supported
      if (this.capabilities.supportsHitTest && config.mode === 'immersive-ar') {
        await this.initializeHitTest();
      }

      this.sessionState.isActive = true;
      this.sessionState.mode = config.mode;
      this.sessionState.environmentBlendMode = this.session.environmentBlendMode;
      this.sessionState.interactionMode = this.session.interactionMode;
      this.sessionState.visibilityState = this.session.visibilityState;

      this.emit('sessionStarted', {
        session: this.session,
        mode: config.mode,
        capabilities: this.capabilities,
      });

      // Start render loop
      this.startRenderLoop();

      return this.session;
    } catch (error) {
      console.error('Failed to request XR session:', error);
      this.emit('sessionError', error);
      throw error;
    }
  }

  /**
   * End the current WebXR session
   */
  public async endSession(): Promise<void> {
    if (!this.session) {
      return;
    }

    try {
      await this.session.end();
    } catch (error) {
      console.error('Error ending XR session:', error);
    }
  }

  /**
   * Set up session event listeners
   */
  private setupSessionEventListeners(): void {
    if (!this.session) return;

    this.session.addEventListener('end', () => {
      this.handleSessionEnd();
    });

    this.session.addEventListener('visibilitychange', () => {
      if (this.session) {
        this.sessionState.visibilityState = this.session.visibilityState;
        this.emit('visibilityChange', this.session.visibilityState);
      }
    });

    this.session.addEventListener('inputsourceschange', (event) => {
      this.handleInputSourcesChange(event as XRInputSourceChangeEvent);
    });

    this.session.addEventListener('select', (event) => {
      this.handleSelect(event as XRInputSourceEvent);
    });

    this.session.addEventListener('selectstart', (event) => {
      this.handleSelectStart(event as XRInputSourceEvent);
    });

    this.session.addEventListener('selectend', (event) => {
      this.handleSelectEnd(event as XRInputSourceEvent);
    });

    this.session.addEventListener('squeeze', (event) => {
      this.handleSqueeze(event as XRInputSourceEvent);
    });
  }

  /**
   * Initialize input sources (controllers, hands)
   */
  private async initializeInputSources(): Promise<void> {
    if (!this.session) return;

    this.sessionState.inputSources = Array.from(this.session.inputSources);
    
    for (const inputSource of this.sessionState.inputSources) {
      await this.processInputSource(inputSource);
    }
  }

  /**
   * Process an individual input source
   */
  private async processInputSource(inputSource: XRInputSource): Promise<void> {
    const controllerState: XRControllerState = {
      id: inputSource.targetRayMode + '_' + inputSource.handedness,
      handedness: inputSource.handedness,
      targetRayMode: inputSource.targetRayMode,
      profiles: inputSource.profiles,
      buttons: {},
      axes: [],
    };

    // Process gamepad data if available
    if (inputSource.gamepad) {
      inputSource.gamepad.buttons.forEach((button, index) => {
        controllerState.buttons[index] = {
          pressed: button.pressed,
          touched: button.touched,
          value: button.value,
        };
      });
      
      controllerState.axes = Array.from(inputSource.gamepad.axes);
    }

    this.controllers.set(controllerState.id, controllerState);
    
    // Initialize hand tracking if supported
    if (this.capabilities.supportsHandTracking && inputSource.hand) {
      await this.initializeHandTracking(inputSource);
    }

    this.emit('controllerConnected', controllerState);
  }

  /**
   * Initialize hand tracking for an input source
   */
  private async initializeHandTracking(inputSource: XRInputSource): Promise<void> {
    if (!inputSource.hand) return;

    const handData = {
      joints: {} as { [jointName: string]: XRJointPose },
      handedness: inputSource.handedness as 'left' | 'right',
      confidence: 1.0,
    };

    // Initialize joint tracking
    for (const jointName of inputSource.hand.keys()) {
      // Joint data will be updated in the render loop
      handData.joints[jointName] = {} as XRJointPose;
    }

    if (inputSource.handedness === 'left') {
      this.handTracking.left = handData;
    } else if (inputSource.handedness === 'right') {
      this.handTracking.right = handData;
    }

    this.emit('handTrackingInitialized', {
      handedness: inputSource.handedness,
      jointNames: Array.from(inputSource.hand.keys()),
    });
  }

  /**
   * Initialize hit test functionality
   */
  private async initializeHitTest(): Promise<void> {
    if (!this.session || !this.sessionState.referenceSpace) return;

    try {
      const hitTestSource = await this.session.requestHitTestSource({
        space: this.sessionState.referenceSpace,
      });
      
      this.hitTestSources.push(hitTestSource);
      this.emit('hitTestInitialized');
    } catch (error) {
      console.warn('Hit test initialization failed:', error);
    }
  }

  /**
   * Start the WebXR render loop
   */
  private startRenderLoop(): void {
    if (!this.session) return;

    const renderFrame = (time: number, frame: XRFrame) => {
      if (!this.session || !this.sessionState.isActive) return;

      // Update controller poses
      this.updateControllerPoses(frame);
      
      // Update hand tracking
      this.updateHandTracking(frame);
      
      // Process hit test results
      this.processHitTestResults(frame);
      
      // Emit frame data
      this.emit('frame', {
        time,
        frame,
        controllers: Array.from(this.controllers.values()),
        handTracking: this.handTracking,
        session: this.session,
      });

      // Request next frame
      this.animationFrameId = this.session.requestAnimationFrame(renderFrame);
    };

    this.animationFrameId = this.session.requestAnimationFrame(renderFrame);
  }

  /**
   * Update controller poses in the render loop
   */
  private updateControllerPoses(frame: XRFrame): void {
    if (!this.sessionState.referenceSpace) return;

    for (const [id, controller] of this.controllers.entries()) {
      const inputSource = this.sessionState.inputSources.find(
        source => (source.targetRayMode + '_' + source.handedness) === id
      );

      if (inputSource && inputSource.targetRaySpace) {
        const pose = frame.getPose(inputSource.targetRaySpace, this.sessionState.referenceSpace);
        
        if (pose) {
          controller.position = pose.transform.position;
          controller.orientation = pose.transform.orientation;
        }
      }
    }
  }

  /**
   * Update hand tracking data in the render loop
   */
  private updateHandTracking(frame: XRFrame): void {
    if (!this.capabilities.supportsHandTracking || !this.sessionState.referenceSpace) return;

    for (const inputSource of this.sessionState.inputSources) {
      if (inputSource.hand) {
        const handData = inputSource.handedness === 'left' ? 
          this.handTracking.left : this.handTracking.right;

        if (handData) {
          for (const [jointName, jointSpace] of inputSource.hand.entries()) {
            const jointPose = frame.getJointPose(jointSpace, this.sessionState.referenceSpace);
            
            if (jointPose) {
              handData.joints[jointName] = jointPose;
            }
          }
          
          // Update confidence based on tracking quality
          handData.confidence = this.calculateHandTrackingConfidence(handData.joints);
        }
      }
    }

    this.emit('handTrackingUpdate', this.handTracking);
  }

  /**
   * Calculate hand tracking confidence
   */
  private calculateHandTrackingConfidence(joints: { [jointName: string]: XRJointPose }): number {
    const jointNames = Object.keys(joints);
    const validJoints = jointNames.filter(name => joints[name] && joints[name].radius !== undefined);
    
    return validJoints.length / jointNames.length;
  }

  /**
   * Process hit test results
   */
  private processHitTestResults(frame: XRFrame): void {
    if (this.hitTestSources.length === 0) return;

    const hitTestResults: XRHitTestResult[] = [];
    
    for (const hitTestSource of this.hitTestSources) {
      const results = frame.getHitTestResults(hitTestSource);
      hitTestResults.push(...results);
    }

    if (hitTestResults.length > 0) {
      this.emit('hitTestResults', hitTestResults);
    }
  }

  /**
   * Handle session end
   */
  private handleSessionEnd(): void {
    this.sessionState.isActive = false;
    this.sessionState.mode = null;
    this.sessionState.referenceSpace = null;
    this.sessionState.inputSources = [];
    
    this.controllers.clear();
    this.handTracking = {};
    this.hitTestSources = [];
    this.anchors.clear();
    
    if (this.animationFrameId) {
      // XR session ended, animation frame is automatically cancelled
      this.animationFrameId = null;
    }
    
    this.session = null;
    
    this.emit('sessionEnded');
  }

  /**
   * Handle input sources change
   */
  private handleInputSourcesChange(event: XRInputSourceChangeEvent): void {
    // Handle added input sources
    for (const inputSource of event.added) {
      this.processInputSource(inputSource);
    }

    // Handle removed input sources
    for (const inputSource of event.removed) {
      const id = inputSource.targetRayMode + '_' + inputSource.handedness;
      this.controllers.delete(id);
      
      if (inputSource.handedness === 'left') {
        delete this.handTracking.left;
      } else if (inputSource.handedness === 'right') {
        delete this.handTracking.right;
      }
      
      this.emit('controllerDisconnected', id);
    }

    this.sessionState.inputSources = Array.from(this.session?.inputSources || []);
  }

  /**
   * Handle select events
   */
  private handleSelect(event: XRInputSourceEvent): void {
    this.emit('select', {
      inputSource: event.inputSource,
      frame: event.frame,
    });
  }

  private handleSelectStart(event: XRInputSourceEvent): void {
    this.emit('selectStart', {
      inputSource: event.inputSource,
      frame: event.frame,
    });
  }

  private handleSelectEnd(event: XRInputSourceEvent): void {
    this.emit('selectEnd', {
      inputSource: event.inputSource,
      frame: event.frame,
    });
  }

  private handleSqueeze(event: XRInputSourceEvent): void {
    this.emit('squeeze', {
      inputSource: event.inputSource,
      frame: event.frame,
    });
  }

  /**
   * Create an anchor at a given pose
   */
  public async createAnchor(pose: XRRigidTransform, space: XRSpace): Promise<XRAnchor | null> {
    if (!this.session || !this.capabilities.supportsAnchors) {
      return null;
    }

    try {
      const anchor = await this.session.requestAnchor(pose, space);
      this.anchors.add(anchor);
      
      this.emit('anchorCreated', anchor);
      return anchor;
    } catch (error) {
      console.error('Failed to create anchor:', error);
      return null;
    }
  }

  /**
   * Delete an anchor
   */
  public deleteAnchor(anchor: XRAnchor): void {
    if (this.anchors.has(anchor)) {
      anchor.delete();
      this.anchors.delete(anchor);
      this.emit('anchorDeleted', anchor);
    }
  }

  // Getters
  public getSession(): XRSession | null {
    return this.session;
  }

  public getSessionState(): WebXRSessionState {
    return { ...this.sessionState };
  }

  public getCapabilities(): WebXRDeviceCapabilities {
    return { ...this.capabilities };
  }

  public getControllers(): XRControllerState[] {
    return Array.from(this.controllers.values());
  }

  public getHandTracking(): HandTrackingData {
    return { ...this.handTracking };
  }

  public isSessionActive(): boolean {
    return this.sessionState.isActive;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.session) {
      this.endSession();
    }
    
    this.removeAllListeners();
  }
}

export default WebXRManager;