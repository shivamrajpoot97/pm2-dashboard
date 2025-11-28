import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface LinkedServer {
  id: string;
  name: string;
  secret: string;
  publicKey: string;
  hostname: string;
  ip: string;
  lastSeen: number;
  isActive: boolean;
  pm2Data?: any;
  systemInfo?: any;
}

// In-memory storage for demo purposes (resets on each deployment)
// In production, you would use a database like Vercel KV, PostgreSQL, etc.
let linkedServers: LinkedServer[] = [];

// Check if running on Vercel or in demo mode
const isVercelOrDemo = process.env.VERCEL_ENV || process.env.DEMO_MODE === 'true';

// Initialize with some demo servers for demonstration
function initializeDemoServers() {
  if (linkedServers.length === 0 && isVercelOrDemo) {
    linkedServers = [
      {
        id: crypto.randomUUID(),
        name: 'Demo Production Server',
        secret: 'demo-secret-1',
        publicKey: 'demo-key-1',
        hostname: 'prod-server-01',
        ip: '192.168.1.100',
        lastSeen: Date.now() - 30000, // 30 seconds ago
        isActive: true,
        pm2Data: [
          {
            name: 'api-server',
            status: 'online',
            cpu: 15.5,
            memory: 125000000,
            restart_time: 2
          },
          {
            name: 'worker-queue',
            status: 'online', 
            cpu: 8.2,
            memory: 98000000,
            restart_time: 0
          }
        ],
        systemInfo: {
          hostname: 'prod-server-01',
          totalmem: 8589934592,
          freemem: 2147483648,
          loadavg: [1.2, 0.8, 0.5]
        }
      },
      {
        id: crypto.randomUUID(),
        name: 'Demo Staging Server',
        secret: 'demo-secret-2',
        publicKey: 'demo-key-2',
        hostname: 'staging-server-01',
        ip: '192.168.1.101',
        lastSeen: Date.now() - 180000, // 3 minutes ago (inactive)
        isActive: false,
        pm2Data: [
          {
            name: 'staging-api',
            status: 'stopped',
            cpu: 0,
            memory: 0,
            restart_time: 5
          }
        ],
        systemInfo: {
          hostname: 'staging-server-01',
          totalmem: 4294967296,
          freemem: 1073741824,
          loadavg: [0.1, 0.1, 0.1]
        }
      }
    ];
  }
}

// Get all linked servers
async function getLinkedServers(): Promise<LinkedServer[]> {
  if (isVercelOrDemo) {
    initializeDemoServers();
  }
  return linkedServers;
}

// Save linked servers (in-memory for Vercel/demo)
async function saveLinkedServers(servers: LinkedServer[]) {
  linkedServers = servers;
  // Note: In production, you would save to a database here
  // For example: await db.servers.upsert(servers);
}

// Generate link credentials
function generateLinkCredentials() {
  const secret = crypto.randomBytes(32).toString('hex');
  const publicKey = crypto.randomBytes(16).toString('hex');
  return { secret, publicKey };
}

// Verify server credentials
function verifyCredentials(secret: string, publicKey: string, servers: LinkedServer[]) {
  return servers.find(s => s.secret === secret && s.publicKey === publicKey);
}

// POST: Create new server link or receive data from linked server
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create-link':
        return await createServerLink(request, body);
      case 'report-data':
        return await receiveServerData(request, body);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Link operation failed',
        message: error.message,
        demoMode: isVercelOrDemo,
        note: isVercelOrDemo ? 'This is demo mode. Links are stored in memory and will reset on deployment.' : undefined
      },
      { status: 500 }
    );
  }
}

// GET: List linked servers or get link status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        return await listLinkedServers();
      case 'generate':
        return await generateNewLink(request);
      default:
        return await getLinkedServersStatus();
    }
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get link information',
        message: error.message,
        demoMode: isVercelOrDemo
      },
      { status: 500 }
    );
  }
}

// Create a new server link
async function createServerLink(request: NextRequest, config: {
  name: string;
  hostname?: string;
  description?: string;
}) {
  const { secret, publicKey } = generateLinkCredentials();
  const serverId = crypto.randomUUID();
  
  const newServer: LinkedServer = {
    id: serverId,
    name: config.name,
    secret,
    publicKey,
    hostname: config.hostname || 'unknown',
    ip: '',
    lastSeen: 0,
    isActive: false
  };

  const servers = await getLinkedServers();
  servers.push(newServer);
  await saveLinkedServers(servers);

  // Auto-detect dashboard URL from request
  const url = new URL(request.url);
  const dashboardUrl = process.env.DASHBOARD_URL || `${url.protocol}//${url.host}`;
  const linkCommand = `curl -s "${dashboardUrl}/api/pm2/link/agent" | bash -s -- ${secret} ${publicKey} "${dashboardUrl}"`;
  
  return NextResponse.json({
    success: true,
    message: isVercelOrDemo ? 
      'Demo server link created (stored in memory)' : 
      'Server link created successfully',
    data: {
      serverId,
      name: config.name,
      secret,
      publicKey,
      linkCommand,
      installInstructions: {
        step1: 'Run this command on your remote server:',
        command: linkCommand,
        step2: 'The server will automatically start reporting to this dashboard',
        step3: 'Check the "Linked Servers" section to see connected servers',
        note: isVercelOrDemo ? 
          'Note: This is demo mode. Links are stored in memory and will reset on redeployment.' : 
          undefined
      }
    },
    demoMode: isVercelOrDemo
  });
}

// Receive data from a linked server
async function receiveServerData(request: NextRequest, body: {
  secret: string;
  publicKey: string;
  hostname: string;
  ip: string;
  pm2Data: any;
  systemInfo: any;
}) {
  const servers = await getLinkedServers();
  const server = verifyCredentials(body.secret, body.publicKey, servers);
  
  if (!server) {
    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  // Update server data
  server.hostname = body.hostname;
  server.ip = body.ip;
  server.lastSeen = Date.now();
  server.isActive = true;
  server.pm2Data = body.pm2Data;
  server.systemInfo = body.systemInfo;

  await saveLinkedServers(servers);

  return NextResponse.json({
    success: true,
    message: 'Data received successfully',
    nextReport: 30000, // Report every 30 seconds
    demoMode: isVercelOrDemo
  });
}

// List all linked servers
async function listLinkedServers() {
  const servers = await getLinkedServers();
  
  // Mark servers as inactive if not seen for 2 minutes
  const now = Date.now();
  servers.forEach(server => {
    server.isActive = (now - server.lastSeen) < 120000; // 2 minutes
  });

  await saveLinkedServers(servers);

  return NextResponse.json({
    success: true,
    data: {
      servers: servers.map(server => ({
        id: server.id,
        name: server.name,
        hostname: server.hostname,
        ip: server.ip,
        isActive: server.isActive,
        lastSeen: server.lastSeen,
        processCount: server.pm2Data?.length || 0,
        systemLoad: server.systemInfo?.loadavg?.[0] || 0,
        memoryUsage: server.systemInfo ? 
          ((server.systemInfo.totalmem - server.systemInfo.freemem) / server.systemInfo.totalmem * 100) : 0
      })),
      totalServers: servers.length,
      activeServers: servers.filter(s => s.isActive).length
    },
    demoMode: isVercelOrDemo,
    note: isVercelOrDemo ? 
      'Demo mode: Server links are stored in memory and will reset on redeployment. Use a database for production.' : 
      undefined
  });
}

// Generate new link credentials
async function generateNewLink(request: NextRequest) {
  const { secret, publicKey } = generateLinkCredentials();
  const url = new URL(request.url);
  const dashboardUrl = process.env.DASHBOARD_URL || `${url.protocol}//${url.host}`;
  
  return NextResponse.json({
    success: true,
    data: {
      secret,
      publicKey,
      dashboardUrl,
      linkCommand: `curl -s "${dashboardUrl}/api/pm2/link/agent" | bash -s -- ${secret} ${publicKey} "${dashboardUrl}"`,
      manualSetup: {
        step1: 'Create a server link first with POST /api/pm2/link',
        step2: 'Then use the generated command on your remote server'
      }
    },
    demoMode: isVercelOrDemo,
    note: isVercelOrDemo ? 
      'Demo mode: Links are stored in memory. For production, implement persistent storage.' : 
      undefined
  });
}

// Get status of linked servers
async function getLinkedServersStatus() {
  const servers = await getLinkedServers();
  const now = Date.now();
  
  return NextResponse.json({
    success: true,
    data: {
      summary: {
        total: servers.length,
        active: servers.filter(s => (now - s.lastSeen) < 120000).length,
        inactive: servers.filter(s => (now - s.lastSeen) >= 120000).length
      },
      recentActivity: servers
        .filter(s => s.lastSeen > 0)
        .sort((a, b) => b.lastSeen - a.lastSeen)
        .slice(0, 5)
        .map(s => ({
          name: s.name,
          hostname: s.hostname,
          lastSeen: s.lastSeen,
          isActive: (now - s.lastSeen) < 120000
        }))
    },
    demoMode: isVercelOrDemo,
    note: isVercelOrDemo ? 
      'Demo mode: Showing sample linked servers. Data resets on deployment.' : 
      undefined
  });
}

// DELETE: Remove a linked server
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('id');
    
    if (!serverId) {
      return NextResponse.json(
        { success: false, error: 'Server ID is required' },
        { status: 400 }
      );
    }

    const servers = await getLinkedServers();
    const updatedServers = servers.filter(s => s.id !== serverId);
    
    if (servers.length === updatedServers.length) {
      return NextResponse.json(
        { success: false, error: 'Server not found' },
        { status: 404 }
      );
    }

    await saveLinkedServers(updatedServers);

    return NextResponse.json({
      success: true,
      message: isVercelOrDemo ? 
        'Demo server link removed (from memory)' : 
        'Server link removed successfully',
      demoMode: isVercelOrDemo
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to remove server link',
        message: error.message,
        demoMode: isVercelOrDemo
      },
      { status: 500 }
    );
  }
}