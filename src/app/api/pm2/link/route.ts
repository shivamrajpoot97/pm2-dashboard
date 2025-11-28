import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
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

const LINKS_DIR = path.join(process.cwd(), '.pm2-links');
const LINKS_FILE = path.join(LINKS_DIR, 'servers.json');

// Ensure links directory exists
async function ensureLinksDir() {
  if (!existsSync(LINKS_DIR)) {
    await mkdir(LINKS_DIR, { recursive: true });
  }
}

// Get all linked servers
async function getLinkedServers(): Promise<LinkedServer[]> {
  try {
    await ensureLinksDir();
    if (!existsSync(LINKS_FILE)) {
      return [];
    }
    const data = await readFile(LINKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Save linked servers
async function saveLinkedServers(servers: LinkedServer[]) {
  await ensureLinksDir();
  await writeFile(LINKS_FILE, JSON.stringify(servers, null, 2));
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
        message: error.message 
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
        message: error.message 
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
    message: 'Server link created successfully',
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
        step3: 'Check the "Linked Servers" section to see connected servers'
      }
    }
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
    nextReport: 30000 // Report every 30 seconds
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
    }
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
    }
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
    }
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
      message: 'Server link removed successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to remove server link',
        message: error.message 
      },
      { status: 500 }
    );
  }
}