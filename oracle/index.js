/**
 * FundTrack Oracle Service - FIXED VERSION
 * 
 * This off-chain service monitors project milestones and verifies completion
 * using external data sources (satellite imagery, APIs, IoT sensors, etc.)
 */

require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// ============ Configuration ============

const config = {
  // Blockchain connection
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  contractAddress: process.env.FUNDTRACK_CONTRACT_ADDRESS,
  oraclePrivateKey: process.env.ORACLE_PRIVATE_KEY,
  
  // External data sources
  satelliteApiUrl: process.env.SATELLITE_API_URL || 'https://api.satellite-provider.com',
  satelliteApiKey: process.env.SATELLITE_API_KEY,
  
  // Verification criteria
  verificationInterval: '*/30 * * * *', // Check every 30 minutes
};

// Validate configuration
if (!config.contractAddress) {
  console.error('❌ Error: FUNDTRACK_CONTRACT_ADDRESS not set in .env');
  process.exit(1);
}

if (!config.oraclePrivateKey) {
  console.error('❌ Error: ORACLE_PRIVATE_KEY not set in .env');
  process.exit(1);
}

// ============ Contract ABI (Minimal - only what we need) ============

const FUNDTRACK_ABI = [
  "event ProjectCreated(uint256 indexed projectId, address indexed creator, string projectName, uint256 targetAmount, uint256 timestamp)",
  "event Funded(uint256 indexed projectId, address indexed funder, uint256 amount, uint256 totalFundsRaised)",
  "event MilestoneVerified(uint256 indexed projectId, uint256 milestoneIndex, string milestoneTitle, uint256 timestamp)",
  "event FundsReleased(uint256 indexed projectId, address indexed creator, uint256 amount, uint256 milestoneIndex)",
  "function verifyMilestone(uint256 _projectId, uint256 _milestoneIndex) external",
  "function getProject(uint256 _projectId) external view returns (uint256 id, string projectName, string description, address creator, uint256 targetAmount, uint256 fundsRaised, uint256 fundsReleased, bool active, uint256 createdAt)",
  "function getMilestones(uint256 _projectId) external view returns (tuple(string title, uint8 percentage, bool completed, uint256 completedAt)[])",
  "function projectCount() external view returns (uint256)"
];

// ============ Initialize Provider & Contract ============

let provider;
let wallet;
let contract;

try {
  provider = new ethers.JsonRpcProvider(config.rpcUrl);
  wallet = new ethers.Wallet(config.oraclePrivateKey, provider);
  contract = new ethers.Contract(config.contractAddress, FUNDTRACK_ABI, wallet);
  console.log('✅ Oracle wallet initialized:', wallet.address);
} catch (error) {
  console.error('❌ Error initializing wallet:', error.message);
  process.exit(1);
}

// ============ Data Sources ============

/**
 * Fetch satellite imagery data for a specific location
 */
async function fetchSatelliteData(projectId, coordinates) {
  try {
    console.log(`Fetching satellite data for project ${projectId}...`);
    
    // Mock response for testing
    // In production, replace with actual API call
    return {
      success: true,
      imageUrl: 'https://example.com/satellite-image.jpg',
      metadata: {
        date: new Date().toISOString(),
        coverage: 75,
        cloudCoverage: 10
      },
      analysis: {
        solarPanelCoverage: 65,
        constructionProgress: 70,
        ndvi: 0.75
      }
    };
    
    /* Uncomment for real API integration:
    const response = await axios.get(`${config.satelliteApiUrl}/imagery`, {
      headers: {
        'Authorization': `Bearer ${config.satelliteApiKey}`
      },
      params: {
        lat: coordinates.lat,
        lon: coordinates.lon,
        date: new Date().toISOString(),
        type: 'rgb'
      }
    });
    
    return {
      success: true,
      imageUrl: response.data.imageUrl,
      metadata: response.data.metadata,
      analysis: response.data.analysis
    };
    */
  } catch (error) {
    console.error('Error fetching satellite data:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch IoT sensor data
 */
async function fetchIoTData(projectId, sensorId) {
  try {
    console.log(`Fetching IoT data for project ${projectId}, sensor ${sensorId}...`);
    
    // Mock response for testing
    return {
      success: true,
      sensorId: sensorId,
      readings: [
        { timestamp: Date.now(), value: 1250 },
        { timestamp: Date.now() - 3600000, value: 1180 }
      ],
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error fetching IoT data:', error.message);
    return { success: false, error: error.message };
  }
}

// ============ Verification Logic ============

/**
 * Project-specific verification rules
 */
const verificationRules = {
  // Solar Farm: Verify installation progress via satellite imagery
  solarFarm: async (projectId, milestoneIndex, projectData) => {
    const coordinates = projectData.metadata.coordinates;
    const satelliteData = await fetchSatelliteData(projectId, coordinates);
    
    if (!satelliteData.success) return false;
    
    const panelCoverage = satelliteData.analysis?.solarPanelCoverage || 0;
    const requiredCoverage = projectData.metadata.milestones[milestoneIndex].requiredCoverage;
    
    console.log(`  Solar panel coverage: ${panelCoverage}%, Required: ${requiredCoverage}%`);
    return panelCoverage >= requiredCoverage;
  },
  
  // Construction: Verify building progress
  construction: async (projectId, milestoneIndex, projectData) => {
    const coordinates = projectData.metadata.coordinates;
    const satelliteData = await fetchSatelliteData(projectId, coordinates);
    
    if (!satelliteData.success) return false;
    
    const constructionProgress = satelliteData.analysis?.constructionProgress || 0;
    const requiredProgress = projectData.metadata.milestones[milestoneIndex].requiredProgress;
    
    console.log(`  Construction progress: ${constructionProgress}%, Required: ${requiredProgress}%`);
    return constructionProgress >= requiredProgress;
  },
  
  // Energy Production: Verify actual energy production via IoT sensors
  energyProduction: async (projectId, milestoneIndex, projectData) => {
    const sensorId = projectData.metadata.energySensorId;
    const iotData = await fetchIoTData(projectId, sensorId);
    
    if (!iotData.success) return false;
    
    const totalOutput = iotData.readings.reduce((sum, r) => sum + r.value, 0);
    const targetOutput = projectData.metadata.milestones[milestoneIndex].targetOutput;
    
    console.log(`  Energy output: ${totalOutput} kWh, Target: ${targetOutput} kWh`);
    return totalOutput >= targetOutput;
  },
  
  // Auto-verify for testing (REMOVE IN PRODUCTION)
  test: async (projectId, milestoneIndex, projectData) => {
    console.log(`  ⚠️  Using TEST verification (auto-approve)`);
    return true; // Always returns true for testing
  }
};

/**
 * Verify a specific milestone for a project
 */
async function verifyMilestone(projectId, milestoneIndex) {
  try {
    console.log(`\n=== Verifying Project ${projectId}, Milestone ${milestoneIndex} ===`);
    
    // Fetch project data from blockchain
    const projectData = await contract.getProject(projectId);
    const milestones = await contract.getMilestones(projectId);
    
    if (milestones[milestoneIndex].completed) {
      console.log('⏭️  Milestone already completed, skipping...');
      return;
    }
    
    console.log(`Project: ${projectData.projectName}`);
    console.log(`Milestone: ${milestones[milestoneIndex].title}`);
    
    // Get project metadata (stored off-chain)
    const projectMetadata = await fetchProjectMetadata(projectId);
    
    // Determine project type and apply appropriate verification
    const projectType = projectMetadata.type;
    const verificationFunction = verificationRules[projectType];
    
    if (!verificationFunction) {
      console.error(`❌ No verification rule for project type: ${projectType}`);
      return;
    }
    
    // Run verification
    console.log('🔍 Running verification checks...');
    const isVerified = await verificationFunction(projectId, milestoneIndex, projectMetadata);
    
    if (isVerified) {
      console.log('✅ Milestone verified! Calling smart contract...');
      
      // Call smart contract to mark milestone as completed
      const tx = await contract.verifyMilestone(projectId, milestoneIndex);
      console.log(`📤 Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed! Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
      // Log verification event
      await logVerificationEvent(projectId, milestoneIndex, true, receipt.hash);
    } else {
      console.log('❌ Milestone verification failed. Criteria not met.');
      await logVerificationEvent(projectId, milestoneIndex, false, null);
    }
    
  } catch (error) {
    console.error(`❌ Error verifying milestone: ${error.message}`);
    if (error.data) {
      console.error('Error data:', error.data);
    }
  }
}

/**
 * Fetch project metadata (from IPFS, database, or mock for testing)
 */
async function fetchProjectMetadata(projectId) {
  // In production, fetch from IPFS or decentralized storage
  // For testing, return mock data
  return {
    projectId: projectId,
    type: 'test', // Change to 'solarFarm', 'construction', 'energyProduction' for real verification
    metadata: {
      coordinates: { lat: -1.9403, lon: 29.8739 }, // Kigali
      energySensorId: 'sensor-001',
      milestones: [
        {
          requiredCoverage: 25,
          requiredProgress: 25,
          targetOutput: 1000
        },
        {
          requiredCoverage: 50,
          requiredProgress: 50,
          targetOutput: 2500
        },
        {
          requiredCoverage: 75,
          requiredProgress: 75,
          targetOutput: 4000
        },
        {
          requiredCoverage: 100,
          requiredProgress: 100,
          targetOutput: 5000
        }
      ]
    }
  };
}

/**
 * Log verification event
 */
async function logVerificationEvent(projectId, milestoneIndex, success, txHash) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    projectId,
    milestoneIndex,
    success,
    transactionHash: txHash
  };
  
  console.log('📝 Logging verification event:', JSON.stringify(logEntry, null, 2));
  
  // In production: save to database or file
  try {
    const logFile = path.join(__dirname, 'verification-logs.json');
    let logs = [];
    
    if (fs.existsSync(logFile)) {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Warning: Could not write log file:', error.message);
  }
}

// ============ Main Oracle Loop ============

/**
 * Check all active projects and verify milestones
 */
async function checkAllProjects() {
  try {
    console.log('\n========================================');
    console.log('🔎 Oracle Check Started');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log('========================================');
    
    const projectCount = await contract.projectCount();
    console.log(`📊 Total projects: ${projectCount}`);
    
    if (projectCount === 0n) {
      console.log('ℹ️  No projects found yet.');
      return;
    }
    
    for (let i = 0; i < projectCount; i++) {
      const project = await contract.getProject(i);
      
      if (!project.active) {
        console.log(`⏭️  Project ${i} is inactive, skipping...`);
        continue;
      }
      
      console.log(`\n📋 Checking Project ${i}: ${project.projectName}`);
      
      const milestones = await contract.getMilestones(i);
      console.log(`   Milestones: ${milestones.length}`);
      
      // Check each milestone
      let hasUncompletedMilestone = false;
      for (let j = 0; j < milestones.length; j++) {
        if (!milestones[j].completed) {
          console.log(`   → Milestone ${j}: "${milestones[j].title}" - Not completed`);
          
          if (!hasUncompletedMilestone) {
            // Only verify the first uncompleted milestone
            await verifyMilestone(i, j);
            hasUncompletedMilestone = true;
            break; // Only verify one milestone per project per check
          }
        } else {
          console.log(`   ✅ Milestone ${j}: "${milestones[j].title}" - Completed`);
        }
      }
      
      if (!hasUncompletedMilestone) {
        console.log(`   🎉 All milestones completed!`);
      }
    }
    
    console.log('\n========================================');
    console.log('✅ Oracle Check Completed');
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Error in oracle check:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
  }
}

// ============ Event Listeners ============

/**
 * Listen to blockchain events for real-time verification
 */
function setupEventListeners() {
  // Listen for new projects
  contract.on('ProjectCreated', async (projectId, creator, projectName) => {
    console.log(`\n📢 New Project Created!`);
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Name: ${projectName}`);
    console.log(`   Creator: ${creator}`);
  });
  
  // Listen for funding events
  contract.on('Funded', async (projectId, funder, amount) => {
    console.log(`\n💰 Project Funded!`);
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Funder: ${funder}`);
    console.log(`   Amount: ${ethers.formatEther(amount)} ETH`);
  });
  
  // Listen for milestone verification
  contract.on('MilestoneVerified', async (projectId, milestoneIndex, milestoneTitle) => {
    console.log(`\n✅ Milestone Verified!`);
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Milestone: ${milestoneTitle}`);
  });
  
  // Listen for funds released
  contract.on('FundsReleased', async (projectId, creator, amount) => {
    console.log(`\n💸 Funds Released!`);
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Creator: ${creator}`);
    console.log(`   Amount: ${ethers.formatEther(amount)} ETH`);
  });
  
  console.log('✅ Event listeners set up');
}

// ============ Start Oracle Service ============

async function startOracle() {
  console.log('==============================================');
  console.log('    🤖 FundTrack Oracle Service Starting...    ');
  console.log('==============================================\n');
  
  console.log(`📍 Oracle Address: ${wallet.address}`);
  console.log(`📝 Contract Address: ${config.contractAddress}`);
  console.log(`🌐 Network: ${config.rpcUrl}\n`);
  
  // Check oracle balance
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Oracle Balance: ${ethers.formatEther(balance)} ETH\n`);
    
    if (balance === 0n) {
      console.warn('⚠️  WARNING: Oracle has 0 ETH balance. Cannot send transactions!');
      console.warn('   Please fund the oracle address before it can verify milestones.\n');
    }
  } catch (error) {
    console.error('Error checking balance:', error.message);
  }
  
  // Setup event listeners
  setupEventListeners();
  
  // Schedule periodic checks
  console.log(`⏱️  Scheduling checks: ${config.verificationInterval}\n`);
  cron.schedule(config.verificationInterval, checkAllProjects);
  
  // Run initial check
  await checkAllProjects();
  
  console.log('\n✅ Oracle service running...');
  console.log('💡 Tip: The oracle checks every 30 minutes automatically');
  console.log('🛑 Press Ctrl+C to stop\n');
}

// ============ Error Handling & Graceful Shutdown ============

process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down oracle service...');
  contract.removeAllListeners();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});

// ============ Start the Service ============

startOracle().catch(error => {
  console.error('❌ Failed to start oracle:', error);
  process.exit(1);
});