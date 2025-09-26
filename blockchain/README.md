# Blockchain Features

## Overview

Decentralized storage, identity management, and smart contract integration for secure, verifiable, and trustless interactions within the YUR ecosystem.

## Architecture

```
blockchain/
├── storage/             # Decentralized storage and data integrity
├── identity/           # Decentralized identity and authentication
└── smart-contracts/   # Smart contract development and integration
```

## Core Features

### Decentralized Storage
- IPFS integration for distributed file storage
- Content addressing and versioning
- Encrypted data storage with user-controlled keys
- Collaborative workspace persistence

### Decentralized Identity
- Self-sovereign identity (SSI) implementation
- Zero-knowledge proof authentication
- Credential management and verification
- Cross-platform identity portability

### Smart Contracts
- Research data provenance tracking
- Collaborative agreement enforcement
- Plugin marketplace transactions
- Computational resource trading

## Decentralized Storage

### IPFS Integration

```typescript
// storage/ipfs-manager.ts
import { create as createIPFS, IPFS } from 'ipfs-core';
import { CID } from 'multiformats/cid';

export class IPFSManager {
  private ipfs: IPFS | null = null;
  private pinningService: PinningService;
  private encryptionManager: EncryptionManager;

  constructor() {
    this.pinningService = new PinningService();
    this.encryptionManager = new EncryptionManager();
  }

  async initialize(): Promise<void> {
    try {
      this.ipfs = await createIPFS({
        repo: 'yur-ipfs-repo',
        config: {
          Addresses: {
            Swarm: [
              '/dns4/star.thetamarshall.com/tcp/4001/wss/p2p-webrtc-star',
              '/dns4/webrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star'
            ]
          },
          Bootstrap: [
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
          ]
        }
      });

      console.log('IPFS node initialized');
    } catch (error) {
      console.error('Failed to initialize IPFS:', error);
      throw error;
    }
  }

  async storeData(data: any, encrypt: boolean = true): Promise<StorageResult> {
    if (!this.ipfs) throw new Error('IPFS not initialized');

    try {
      let processedData = data;
      let encryptionKey: string | null = null;

      // Encrypt data if requested
      if (encrypt) {
        const encrypted = await this.encryptionManager.encrypt(JSON.stringify(data));
        processedData = encrypted.data;
        encryptionKey = encrypted.key;
      }

      // Add to IPFS
      const result = await this.ipfs.add(JSON.stringify(processedData));
      const cid = result.cid.toString();

      // Pin to ensure persistence
      await this.pinningService.pin(cid);

      // Store metadata
      const metadata: StorageMetadata = {
        cid,
        timestamp: new Date(),
        encrypted: encrypt,
        size: result.size,
        type: this.detectDataType(data)
      };

      return {
        cid,
        encryptionKey,
        metadata,
        ipfsHash: cid
      };
    } catch (error) {
      console.error('Failed to store data:', error);
      throw error;
    }
  }

  async retrieveData(cid: string, encryptionKey?: string): Promise<any> {
    if (!this.ipfs) throw new Error('IPFS not initialized');

    try {
      // Retrieve from IPFS
      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }

      const buffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      let data = JSON.parse(new TextDecoder().decode(buffer));

      // Decrypt if necessary
      if (encryptionKey) {
        data = await this.encryptionManager.decrypt(data, encryptionKey);
        data = JSON.parse(data);
      }

      return data;
    } catch (error) {
      console.error('Failed to retrieve data:', error);
      throw error;
    }
  }

  async storeWorkspaceState(workspaceId: string, state: WorkspaceState): Promise<string> {
    const data = {
      workspaceId,
      state,
      version: state.version || 1,
      timestamp: new Date(),
      checksum: this.calculateChecksum(state)
    };

    const result = await this.storeData(data, true);
    
    // Store reference in workspace registry
    await this.updateWorkspaceRegistry(workspaceId, result.cid);
    
    return result.cid;
  }

  async loadWorkspaceState(workspaceId: string, version?: number): Promise<WorkspaceState> {
    const cid = await this.getWorkspaceCID(workspaceId, version);
    const data = await this.retrieveData(cid);
    
    // Verify checksum
    const calculatedChecksum = this.calculateChecksum(data.state);
    if (calculatedChecksum !== data.checksum) {
      throw new Error('Data integrity check failed');
    }
    
    return data.state;
  }

  async shareData(cid: string, recipients: string[]): Promise<SharingResult> {
    const sharingManifest = {
      cid,
      recipients,
      timestamp: new Date(),
      permissions: ['read'], // Default permissions
      expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    const manifestResult = await this.storeData(sharingManifest, false);
    
    // Notify recipients
    await this.notifyRecipients(recipients, manifestResult.cid);
    
    return {
      sharingManifestCID: manifestResult.cid,
      accessUrl: this.generateAccessUrl(manifestResult.cid),
      recipients
    };
  }
}
```

### Data Integrity and Versioning

```typescript
// storage/versioning-manager.ts
export class VersioningManager {
  private ipfsManager: IPFSManager;
  private versionGraph: Map<string, VersionNode> = new Map();

  constructor(ipfsManager: IPFSManager) {
    this.ipfsManager = ipfsManager;
  }

  async createVersion(
    parentCID: string | null,
    data: any,
    message: string,
    author: string
  ): Promise<VersionResult> {
    // Store the new data
    const dataResult = await this.ipfsManager.storeData(data, true);
    
    // Create version metadata
    const versionMetadata: VersionMetadata = {
      cid: dataResult.cid,
      parentCID,
      message,
      author,
      timestamp: new Date(),
      dataHash: this.calculateHash(data),
      signature: await this.signData(data, author)
    };

    // Store version metadata
    const metadataResult = await this.ipfsManager.storeData(versionMetadata, false);
    
    // Update version graph
    const versionNode: VersionNode = {
      cid: dataResult.cid,
      metadataCID: metadataResult.cid,
      parent: parentCID,
      children: [],
      metadata: versionMetadata
    };

    this.versionGraph.set(dataResult.cid, versionNode);
    
    // Update parent's children list
    if (parentCID) {
      const parent = this.versionGraph.get(parentCID);
      if (parent) {
        parent.children.push(dataResult.cid);
      }
    }

    return {
      versionCID: dataResult.cid,
      metadataCID: metadataResult.cid,
      version: versionMetadata
    };
  }

  async getVersionHistory(rootCID: string): Promise<VersionHistory> {
    const history: VersionEntry[] = [];
    const visited = new Set<string>();
    
    await this.traverseVersions(rootCID, history, visited);
    
    return {
      root: rootCID,
      versions: history.sort((a, b) => 
        a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime()
      ),
      branches: this.identifyBranches(history)
    };
  }

  async mergeVersions(
    baseCID: string,
    branchCID: string,
    strategy: MergeStrategy,
    author: string
  ): Promise<MergeResult> {
    // Retrieve both versions
    const baseData = await this.ipfsManager.retrieveData(baseCID);
    const branchData = await this.ipfsManager.retrieveData(branchCID);
    
    // Perform merge based on strategy
    let mergedData: any;
    let conflicts: Conflict[] = [];
    
    switch (strategy) {
      case 'auto':
        const autoMerge = await this.autoMerge(baseData, branchData);
        mergedData = autoMerge.data;
        conflicts = autoMerge.conflicts;
        break;
      case 'manual':
        // Return conflict data for manual resolution
        conflicts = this.identifyConflicts(baseData, branchData);
        break;
      default:
        throw new Error(`Unknown merge strategy: ${strategy}`);
    }

    if (conflicts.length > 0 && strategy === 'auto') {
      return {
        success: false,
        conflicts,
        requiresManualResolution: true
      };
    }

    // Create merged version
    const mergeResult = await this.createVersion(
      baseCID,
      mergedData,
      `Merge branch ${branchCID.substring(0, 8)} into ${baseCID.substring(0, 8)}`,
      author
    );

    return {
      success: true,
      mergedCID: mergeResult.versionCID,
      conflicts: []
    };
  }
}
```

## Decentralized Identity

### Self-Sovereign Identity Implementation

```typescript
// identity/ssi-manager.ts
import { DID } from '@did-core/core';
import { KeyPair, sign, verify } from '@noble/ed25519';

export class SSIManager {
  private did: DID | null = null;
  private keyPair: KeyPair | null = null;
  private credentialStore: CredentialStore;

  constructor() {
    this.credentialStore = new CredentialStore();
  }

  async createIdentity(userData: UserIdentityData): Promise<IdentityResult> {
    try {
      // Generate key pair
      this.keyPair = await this.generateKeyPair();
      
      // Create DID
      this.did = await this.createDID(this.keyPair.publicKey);
      
      // Create initial credential
      const identityCredential = await this.createIdentityCredential(userData);
      
      // Store in credential store
      await this.credentialStore.store(identityCredential);
      
      return {
        did: this.did.toString(),
        publicKey: this.keyPair.publicKey,
        credential: identityCredential
      };
    } catch (error) {
      console.error('Failed to create identity:', error);
      throw error;
    }
  }

  async issueCredential(
    subject: string,
    claims: CredentialClaims,
    issuer: string
  ): Promise<VerifiableCredential> {
    if (!this.keyPair) throw new Error('Identity not initialized');

    const credential: VerifiableCredential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      id: this.generateCredentialId(),
      issuer,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: subject,
        ...claims
      }
    };

    // Sign credential
    const signature = await this.signCredential(credential);
    credential.proof = {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: `${this.did}#key-1`,
      proofPurpose: 'assertionMethod',
      signature
    };

    return credential;
  }

  async verifyCredential(credential: VerifiableCredential): Promise<VerificationResult> {
    try {
      // Verify signature
      const signatureValid = await this.verifyCredentialSignature(credential);
      
      // Check expiration
      const notExpired = this.checkExpiration(credential);
      
      // Verify issuer
      const issuerValid = await this.verifyIssuer(credential.issuer);
      
      // Check revocation status
      const notRevoked = await this.checkRevocationStatus(credential);
      
      const valid = signatureValid && notExpired && issuerValid && notRevoked;
      
      return {
        valid,
        checks: {
          signature: signatureValid,
          expiration: notExpired,
          issuer: issuerValid,
          revocation: notRevoked
        },
        details: valid ? null : this.getVerificationErrors(credential)
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async createZKProof(
    credential: VerifiableCredential,
    proofRequest: ProofRequest
  ): Promise<ZKProof> {
    // Create zero-knowledge proof for selective disclosure
    const zkProcessor = new ZKProcessor();
    
    return zkProcessor.createProof({
      credential,
      requestedAttributes: proofRequest.requestedAttributes,
      predicates: proofRequest.predicates,
      revealedAttributes: proofRequest.revealedAttributes
    });
  }

  async verifyZKProof(proof: ZKProof, proofRequest: ProofRequest): Promise<boolean> {
    const zkProcessor = new ZKProcessor();
    
    return zkProcessor.verifyProof(proof, proofRequest);
  }

  private async createDID(publicKey: Uint8Array): Promise<DID> {
    // Create DID using the public key
    const identifier = this.encodePublicKey(publicKey);
    const didString = `did:yur:${identifier}`;
    
    return new DID(didString);
  }

  private async signCredential(credential: VerifiableCredential): Promise<string> {
    if (!this.keyPair) throw new Error('Key pair not available');
    
    const canonicalCredential = await this.canonicalize(credential);
    const message = new TextEncoder().encode(canonicalCredential);
    
    const signature = await sign(message, this.keyPair.privateKey);
    return this.encodeSignature(signature);
  }

  private async verifyCredentialSignature(credential: VerifiableCredential): Promise<boolean> {
    if (!credential.proof) return false;
    
    try {
      // Extract public key from verification method
      const publicKey = await this.resolveVerificationMethod(credential.proof.verificationMethod);
      
      // Create canonical form without proof
      const { proof, ...credentialWithoutProof } = credential;
      const canonicalCredential = await this.canonicalize(credentialWithoutProof);
      const message = new TextEncoder().encode(canonicalCredential);
      
      // Verify signature
      const signature = this.decodeSignature(proof.signature);
      return await verify(signature, message, publicKey);
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }
}
```

### Credential Management

```typescript
// identity/credential-store.ts
export class CredentialStore {
  private storage: EncryptedStorage;
  private index: CredentialIndex;

  constructor() {
    this.storage = new EncryptedStorage();
    this.index = new CredentialIndex();
  }

  async store(credential: VerifiableCredential): Promise<string> {
    const credentialId = credential.id || this.generateCredentialId();
    
    // Encrypt credential
    const encrypted = await this.storage.encrypt(JSON.stringify(credential));
    
    // Store encrypted credential
    await this.storage.set(`credential:${credentialId}`, encrypted);
    
    // Update index
    await this.index.addCredential(credentialId, {
      type: credential.type,
      issuer: credential.issuer,
      subject: credential.credentialSubject.id,
      issuanceDate: credential.issuanceDate,
      expirationDate: credential.expirationDate
    });
    
    return credentialId;
  }

  async retrieve(credentialId: string): Promise<VerifiableCredential | null> {
    try {
      const encrypted = await this.storage.get(`credential:${credentialId}`);
      if (!encrypted) return null;
      
      const decrypted = await this.storage.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to retrieve credential:', error);
      return null;
    }
  }

  async search(query: CredentialQuery): Promise<VerifiableCredential[]> {
    const matchingIds = await this.index.search(query);
    
    const credentials = await Promise.all(
      matchingIds.map(id => this.retrieve(id))
    );
    
    return credentials.filter(Boolean) as VerifiableCredential[];
  }

  async revoke(credentialId: string, reason: string): Promise<void> {
    // Mark as revoked in index
    await this.index.markRevoked(credentialId, reason);
    
    // Publish revocation to decentralized registry
    await this.publishRevocation(credentialId, reason);
  }

  private async publishRevocation(credentialId: string, reason: string): Promise<void> {
    const revocationData = {
      credentialId,
      reason,
      timestamp: new Date(),
      revocationId: this.generateRevocationId()
    };
    
    // Store revocation in IPFS or blockchain
    // Implementation depends on chosen decentralized storage
  }
}
```

## Smart Contracts

### Research Data Provenance

```solidity
// smart-contracts/DataProvenance.sol
pragma solidity ^0.8.0;

contract DataProvenance {
    struct Dataset {
        string ipfsHash;
        address creator;
        uint256 timestamp;
        string methodology;
        bytes32 checksum;
        bool isPublic;
        mapping(address => bool) collaborators;
    }
    
    struct ResearchPaper {
        string title;
        string ipfsHash;
        address[] authors;
        string[] datasetIds;
        uint256 timestamp;
        string doi;
        PeerReviewStatus reviewStatus;
    }
    
    enum PeerReviewStatus { Submitted, UnderReview, Accepted, Rejected }
    
    mapping(string => Dataset) public datasets;
    mapping(string => ResearchPaper) public papers;
    mapping(address => string[]) public userDatasets;
    mapping(address => string[]) public userPapers;
    
    event DatasetRegistered(string indexed datasetId, address indexed creator);
    event PaperSubmitted(string indexed paperId, address[] authors);
    event PeerReviewCompleted(string indexed paperId, PeerReviewStatus status);
    event CollaboratorAdded(string indexed datasetId, address collaborator);
    
    modifier onlyDatasetCreator(string memory datasetId) {
        require(datasets[datasetId].creator == msg.sender, "Not dataset creator");
        _;
    }
    
    modifier onlyCollaborator(string memory datasetId) {
        require(
            datasets[datasetId].creator == msg.sender || 
            datasets[datasetId].collaborators[msg.sender],
            "Not authorized"
        );
        _;
    }
    
    function registerDataset(
        string memory datasetId,
        string memory ipfsHash,
        string memory methodology,
        bytes32 checksum,
        bool isPublic
    ) external {
        require(datasets[datasetId].creator == address(0), "Dataset already exists");
        
        Dataset storage dataset = datasets[datasetId];
        dataset.ipfsHash = ipfsHash;
        dataset.creator = msg.sender;
        dataset.timestamp = block.timestamp;
        dataset.methodology = methodology;
        dataset.checksum = checksum;
        dataset.isPublic = isPublic;
        
        userDatasets[msg.sender].push(datasetId);
        
        emit DatasetRegistered(datasetId, msg.sender);
    }
    
    function addCollaborator(
        string memory datasetId,
        address collaborator
    ) external onlyDatasetCreator(datasetId) {
        datasets[datasetId].collaborators[collaborator] = true;
        emit CollaboratorAdded(datasetId, collaborator);
    }
    
    function submitPaper(
        string memory paperId,
        string memory title,
        string memory ipfsHash,
        address[] memory authors,
        string[] memory datasetIds
    ) external {
        require(papers[paperId].timestamp == 0, "Paper already exists");
        
        // Verify author authorization for datasets
        for (uint i = 0; i < datasetIds.length; i++) {
            require(
                datasets[datasetIds[i]].creator == msg.sender ||
                datasets[datasetIds[i]].collaborators[msg.sender] ||
                datasets[datasetIds[i]].isPublic,
                "Unauthorized dataset access"
            );
        }
        
        ResearchPaper storage paper = papers[paperId];
        paper.title = title;
        paper.ipfsHash = ipfsHash;
        paper.authors = authors;
        paper.datasetIds = datasetIds;
        paper.timestamp = block.timestamp;
        paper.reviewStatus = PeerReviewStatus.Submitted;
        
        for (uint i = 0; i < authors.length; i++) {
            userPapers[authors[i]].push(paperId);
        }
        
        emit PaperSubmitted(paperId, authors);
    }
    
    function verifyDataIntegrity(
        string memory datasetId,
        bytes32 providedChecksum
    ) external view returns (bool) {
        return datasets[datasetId].checksum == providedChecksum;
    }
    
    function getDatasetHistory(
        string memory datasetId
    ) external view returns (
        address creator,
        uint256 timestamp,
        string memory methodology,
        bytes32 checksum
    ) {
        Dataset storage dataset = datasets[datasetId];
        return (
            dataset.creator,
            dataset.timestamp,
            dataset.methodology,
            dataset.checksum
        );
    }
}
```

### Plugin Marketplace Contract

```solidity
// smart-contracts/PluginMarketplace.sol
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PluginMarketplace is ERC721, Ownable, ReentrancyGuard {
    struct Plugin {
        string name;
        string description;
        string ipfsHash;
        address developer;
        uint256 price;
        string category;
        uint256 version;
        bool isActive;
        uint256 downloads;
        mapping(address => bool) purchasers;
    }
    
    struct Review {
        address reviewer;
        uint8 rating;
        string comment;
        uint256 timestamp;
    }
    
    mapping(uint256 => Plugin) public plugins;
    mapping(uint256 => Review[]) public pluginReviews;
    mapping(address => uint256[]) public developerPlugins;
    mapping(string => uint256) public pluginByName;
    
    uint256 private _tokenIdCounter;
    uint256 public platformFeePercent = 5; // 5% platform fee
    
    event PluginListed(uint256 indexed tokenId, string name, address developer, uint256 price);
    event PluginPurchased(uint256 indexed tokenId, address buyer, uint256 price);
    event PluginReviewed(uint256 indexed tokenId, address reviewer, uint8 rating);
    event PluginUpdated(uint256 indexed tokenId, uint256 newVersion, string newIpfsHash);
    
    constructor() ERC721("YURPlugin", "YURP") {}
    
    function listPlugin(
        string memory name,
        string memory description,
        string memory ipfsHash,
        uint256 price,
        string memory category
    ) external returns (uint256) {
        require(pluginByName[name] == 0, "Plugin name already exists");
        require(bytes(name).length > 0, "Plugin name required");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        
        uint256 tokenId = ++_tokenIdCounter;
        
        Plugin storage plugin = plugins[tokenId];
        plugin.name = name;
        plugin.description = description;
        plugin.ipfsHash = ipfsHash;
        plugin.developer = msg.sender;
        plugin.price = price;
        plugin.category = category;
        plugin.version = 1;
        plugin.isActive = true;
        plugin.downloads = 0;
        
        pluginByName[name] = tokenId;
        developerPlugins[msg.sender].push(tokenId);
        
        _mint(msg.sender, tokenId);
        
        emit PluginListed(tokenId, name, msg.sender, price);
        
        return tokenId;
    }
    
    function purchasePlugin(uint256 tokenId) external payable nonReentrant {
        require(_exists(tokenId), "Plugin does not exist");
        require(plugins[tokenId].isActive, "Plugin is not active");
        require(msg.value >= plugins[tokenId].price, "Insufficient payment");
        require(!plugins[tokenId].purchasers[msg.sender], "Already purchased");
        
        Plugin storage plugin = plugins[tokenId];
        plugin.purchasers[msg.sender] = true;
        plugin.downloads++;
        
        // Calculate fees
        uint256 platformFee = (msg.value * platformFeePercent) / 100;
        uint256 developerAmount = msg.value - platformFee;
        
        // Transfer payments
        payable(plugin.developer).transfer(developerAmount);
        payable(owner()).transfer(platformFee);
        
        emit PluginPurchased(tokenId, msg.sender, msg.value);
    }
    
    function reviewPlugin(
        uint256 tokenId,
        uint8 rating,
        string memory comment
    ) external {
        require(_exists(tokenId), "Plugin does not exist");
        require(plugins[tokenId].purchasers[msg.sender], "Must purchase plugin first");
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");
        
        pluginReviews[tokenId].push(Review({
            reviewer: msg.sender,
            rating: rating,
            comment: comment,
            timestamp: block.timestamp
        }));
        
        emit PluginReviewed(tokenId, msg.sender, rating);
    }
    
    function updatePlugin(
        uint256 tokenId,
        string memory newIpfsHash
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not plugin owner");
        require(bytes(newIpfsHash).length > 0, "IPFS hash required");
        
        Plugin storage plugin = plugins[tokenId];
        plugin.ipfsHash = newIpfsHash;
        plugin.version++;
        
        emit PluginUpdated(tokenId, plugin.version, newIpfsHash);
    }
    
    function getPluginAverageRating(uint256 tokenId) external view returns (uint256) {
        Review[] memory reviews = pluginReviews[tokenId];
        if (reviews.length == 0) return 0;
        
        uint256 totalRating = 0;
        for (uint i = 0; i < reviews.length; i++) {
            totalRating += reviews[i].rating;
        }
        
        return (totalRating * 100) / reviews.length; // Return as percentage
    }
    
    function hasPurchased(uint256 tokenId, address user) external view returns (bool) {
        return plugins[tokenId].purchasers[user];
    }
    
    function setPlatformFee(uint256 _platformFeePercent) external onlyOwner {
        require(_platformFeePercent <= 10, "Fee cannot exceed 10%");
        platformFeePercent = _platformFeePercent;
    }
}
```

### Computational Resource Trading

```typescript
// smart-contracts/compute-marketplace.ts
export class ComputeMarketplace {
  private web3: Web3;
  private contract: Contract;
  private account: string;

  constructor(web3: Web3, contractAddress: string, account: string) {
    this.web3 = web3;
    this.contract = new web3.eth.Contract(ComputeMarketplaceABI, contractAddress);
    this.account = account;
  }

  async listComputeResource(resource: ComputeResource): Promise<string> {
    const tx = await this.contract.methods.listResource(
      resource.specifications.cpu,
      resource.specifications.memory,
      resource.specifications.gpu,
      resource.pricePerHour,
      resource.availabilityStart,
      resource.availabilityEnd,
      resource.location
    ).send({ from: this.account });

    return tx.transactionHash;
  }

  async requestComputation(request: ComputationRequest): Promise<string> {
    const escrowAmount = this.calculateEscrowAmount(request);
    
    const tx = await this.contract.methods.requestComputation(
      request.requirements.cpu,
      request.requirements.memory,
      request.requirements.gpu,
      request.estimatedDuration,
      request.maxPricePerHour,
      request.dataHash,
      request.computationScript
    ).send({ 
      from: this.account,
      value: escrowAmount
    });

    return tx.transactionHash;
  }

  async matchRequests(): Promise<Match[]> {
    const availableResources = await this.contract.methods.getAvailableResources().call();
    const pendingRequests = await this.contract.methods.getPendingRequests().call();
    
    const matches: Match[] = [];
    
    for (const request of pendingRequests) {
      const compatibleResources = availableResources.filter(resource =>
        this.isCompatible(request.requirements, resource.specifications) &&
        resource.pricePerHour <= request.maxPricePerHour
      );
      
      if (compatibleResources.length > 0) {
        // Select best resource based on price and performance
        const bestResource = this.selectBestResource(compatibleResources, request);
        
        matches.push({
          requestId: request.id,
          resourceId: bestResource.id,
          estimatedCost: this.calculateEstimatedCost(request, bestResource),
          estimatedDuration: request.estimatedDuration
        });
      }
    }
    
    return matches;
  }

  async executeComputation(matchId: string): Promise<ComputationResult> {
    // Start computation on matched resource
    const tx = await this.contract.methods.startComputation(matchId).send({
      from: this.account
    });

    // Monitor computation progress
    return this.monitorComputation(matchId);
  }

  private async monitorComputation(matchId: string): Promise<ComputationResult> {
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const status = await this.contract.methods.getComputationStatus(matchId).call();
          
          switch (status.state) {
            case 'completed':
              resolve({
                success: true,
                resultHash: status.resultHash,
                actualDuration: status.duration,
                actualCost: status.cost
              });
              break;
            case 'failed':
              reject(new Error(`Computation failed: ${status.error}`));
              break;
            case 'running':
              // Continue monitoring
              setTimeout(checkStatus, 10000); // Check every 10 seconds
              break;
          }
        } catch (error) {
          reject(error);
        }
      };
      
      checkStatus();
    });
  }

  private calculateEscrowAmount(request: ComputationRequest): number {
    const estimatedCost = request.estimatedDuration * request.maxPricePerHour;
    return estimatedCost * 1.2; // 20% buffer for escrow
  }

  private isCompatible(requirements: ResourceRequirements, specifications: ResourceSpecifications): boolean {
    return specifications.cpu >= requirements.cpu &&
           specifications.memory >= requirements.memory &&
           specifications.gpu >= requirements.gpu;
  }

  private selectBestResource(resources: ComputeResource[], request: ComputationRequest): ComputeResource {
    // Score resources based on price, performance, and reliability
    return resources.reduce((best, current) => {
      const bestScore = this.calculateResourceScore(best, request);
      const currentScore = this.calculateResourceScore(current, request);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateResourceScore(resource: ComputeResource, request: ComputationRequest): number {
    const priceScore = 1 - (resource.pricePerHour / request.maxPricePerHour);
    const performanceScore = this.calculatePerformanceScore(resource.specifications, request.requirements);
    const reliabilityScore = resource.reputation || 0.5;
    
    return (priceScore * 0.4 + performanceScore * 0.4 + reliabilityScore * 0.2);
  }
}
```

## Integration Examples

### Workspace Persistence

```typescript
// Integration with collaboration system
export class BlockchainWorkspace {
  private ipfsManager: IPFSManager;
  private ssiManager: SSIManager;
  private workspaceContract: Contract;

  async saveWorkspaceToBlockchain(workspace: Workspace): Promise<string> {
    // Store workspace data in IPFS
    const ipfsResult = await this.ipfsManager.storeWorkspaceState(
      workspace.id,
      workspace.state
    );
    
    // Create verifiable credential for workspace
    const credential = await this.ssiManager.issueCredential(
      workspace.owner,
      {
        workspaceId: workspace.id,
        ipfsHash: ipfsResult,
        participants: workspace.participants,
        createdAt: workspace.createdAt
      },
      workspace.owner
    );
    
    // Record on blockchain
    const tx = await this.workspaceContract.methods.registerWorkspace(
      workspace.id,
      ipfsResult,
      credential.proof.signature
    ).send({ from: workspace.owner });
    
    return tx.transactionHash;
  }

  async loadWorkspaceFromBlockchain(workspaceId: string): Promise<Workspace> {
    // Get workspace record from blockchain
    const record = await this.workspaceContract.methods.getWorkspace(workspaceId).call();
    
    // Verify workspace credential
    const isValid = await this.verifyWorkspaceCredential(record);
    if (!isValid) {
      throw new Error('Invalid workspace credential');
    }
    
    // Load workspace data from IPFS
    const workspaceState = await this.ipfsManager.loadWorkspaceState(workspaceId);
    
    return {
      id: workspaceId,
      state: workspaceState,
      owner: record.owner,
      participants: record.participants,
      createdAt: new Date(record.timestamp * 1000)
    };
  }
}
```

## Configuration

### Blockchain Configuration

```typescript
// blockchain.config.ts
export const blockchainConfig = {
  networks: {
    development: {
      ethereum: {
        rpcUrl: 'http://localhost:8545',
        chainId: 1337,
        gasPrice: '20000000000', // 20 gwei
        gasLimit: 6721975
      },
      ipfs: {
        host: 'localhost',
        port: 5001,
        protocol: 'http'
      }
    },
    production: {
      ethereum: {
        rpcUrl: process.env.ETH_RPC_URL,
        chainId: 1, // Mainnet
        gasPrice: 'auto',
        gasLimit: 'auto'
      },
      ipfs: {
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        apiKey: process.env.IPFS_API_KEY
      }
    }
  },
  contracts: {
    dataProvenance: '0x...',
    pluginMarketplace: '0x...',
    computeMarketplace: '0x...'
  },
  identity: {
    didMethod: 'yur',
    keyType: 'Ed25519',
    credentialFormat: 'JSON-LD'
  },
  storage: {
    encryption: {
      algorithm: 'AES-256-GCM',
      keyDerivation: 'PBKDF2'
    },
    pinning: {
      service: 'pinata',
      apiKey: process.env.PINATA_API_KEY
    }
  }
};
```

## Roadmap

### Current Features
- [x] IPFS integration architecture
- [x] Self-sovereign identity framework
- [x] Smart contract templates
- [x] Credential management system

### Planned Features
- [ ] Cross-chain interoperability
- [ ] Advanced zero-knowledge proofs
- [ ] Decentralized governance mechanisms
- [ ] Carbon-neutral blockchain integration
- [ ] Advanced cryptographic protocols
- [ ] Blockchain analytics and monitoring

## Security Considerations

### Key Management
- Hardware security module (HSM) integration
- Multi-signature wallet support
- Key rotation and recovery mechanisms
- Secure key backup and restoration

### Smart Contract Security
- Formal verification of critical contracts
- Regular security audits
- Bug bounty programs
- Gradual deployment and testing

### Privacy Protection
- Zero-knowledge proof implementations
- Selective disclosure mechanisms
- Data minimization principles
- User consent management

## Contributing

Blockchain development requires:
- Solidity and smart contract development experience
- Understanding of cryptographic principles
- Knowledge of decentralized storage systems
- Experience with identity management systems
- Understanding of blockchain security best practices

See [CONTRIBUTING.md](../CONTRIBUTING.md) for blockchain-specific development guidelines.