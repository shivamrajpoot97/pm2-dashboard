#!/usr/bin/env node

/**
 * PM2 Dashboard Link Generator
 * Generate link commands to connect remote servers to your PM2 Dashboard
 */

const https = require('https');
const http = require('http');
const url = require('url');

// Color console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  title: (msg) => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`)
};

class PM2LinkGenerator {
  constructor(dashboardUrl = 'http://localhost:3000') {
    this.dashboardUrl = dashboardUrl;
  }

  async createServerLink(serverName, description = '') {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        action: 'create-link',
        name: serverName,
        hostname: serverName,
        description
      });

      const parsedUrl = url.parse(this.dashboardUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: '/api/pm2/link',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = client.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response.message || 'Failed to create server link'));
            }
          } catch (parseError) {
            reject(new Error('Failed to parse response'));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  async listLinkedServers() {
    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(this.dashboardUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: '/api/pm2/link?action=list',
        method: 'GET'
      };

      const req = client.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response.message || 'Failed to list servers'));
            }
          } catch (parseError) {
            reject(new Error('Failed to parse response'));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      req.end();
    });
  }

  async interactive() {
    log.title('🔗 PM2 Dashboard Link Generator');
    console.log('');
    log.info(`Dashboard URL: ${colors.yellow}${this.dashboardUrl}${colors.reset}`);
    console.log('');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

    try {
      const serverName = await question('Server name (e.g., production-server-01): ');
      
      if (!serverName.trim()) {
        log.error('Server name is required');
        rl.close();
        return;
      }

      log.info('Creating server link...');
      
      const linkData = await this.createServerLink(serverName.trim());
      
      console.log('');
      log.success('Server link created successfully!');
      console.log('');
      console.log(`${colors.bright}Server Details:${colors.reset}`);
      console.log(`  Name: ${colors.yellow}${linkData.name}${colors.reset}`);
      console.log(`  ID: ${colors.cyan}${linkData.serverId}${colors.reset}`);
      console.log('');
      
      console.log(`${colors.bright}Installation Command:${colors.reset}`);
      console.log(`${colors.green}${linkData.linkCommand}${colors.reset}`);
      console.log('');
      
      console.log(`${colors.bright}Instructions:${colors.reset}`);
      console.log(`1. ${linkData.installInstructions.step1}`);
      console.log(`   ${colors.cyan}${linkData.linkCommand}${colors.reset}`);
      console.log(`2. ${linkData.installInstructions.step2}`);
      console.log(`3. ${linkData.installInstructions.step3}`);
      console.log('');
      
      const shouldCopy = await question('Copy command to clipboard? (y/n): ');
      if (shouldCopy.toLowerCase() === 'y') {
        // Try to copy to clipboard (requires xclip on Linux)
        try {
          const { exec } = require('child_process');
          exec(`echo "${linkData.linkCommand}" | xclip -selection clipboard`, (error) => {
            if (error) {
              log.warn('Could not copy to clipboard. Copy manually from above.');
            } else {
              log.success('Command copied to clipboard!');
            }
          });
        } catch (error) {
          log.warn('Clipboard copy not available. Copy manually from above.');
        }
      }
      
    } catch (error) {
      log.error(`Error: ${error.message}`);
    } finally {
      rl.close();
    }
  }

  async listServers() {
    try {
      log.info('Fetching linked servers...');
      const data = await this.listLinkedServers();
      
      console.log('');
      log.title('📊 Linked Servers Status');
      console.log('');
      
      if (data.servers.length === 0) {
        log.warn('No linked servers found');
        console.log('');
        console.log('To add a server, run:');
        console.log(`  ${colors.cyan}node pm2-link.js create${colors.reset}`);
        return;
      }
      
      console.log(`Total: ${data.totalServers} servers | Active: ${colors.green}${data.activeServers}${colors.reset} | Inactive: ${colors.red}${data.totalServers - data.activeServers}${colors.reset}`);
      console.log('');
      
      data.servers.forEach((server, index) => {
        const status = server.isActive ? `${colors.green}●${colors.reset}` : `${colors.red}●${colors.reset}`;
        const lastSeen = server.lastSeen ? new Date(server.lastSeen).toLocaleString() : 'Never';
        
        console.log(`${index + 1}. ${status} ${colors.bright}${server.name}${colors.reset}`);
        console.log(`   Host: ${server.hostname} (${server.ip})`);
        console.log(`   Processes: ${server.processCount} | Load: ${server.systemLoad.toFixed(2)} | Memory: ${server.memoryUsage.toFixed(1)}%`);
        console.log(`   Last seen: ${colors.yellow}${lastSeen}${colors.reset}`);
        console.log('');
      });
      
    } catch (error) {
      log.error(`Error: ${error.message}`);
    }
  }

  async cli(args) {
    const command = args[0];
    const dashboardUrl = args.find(arg => arg.startsWith('--url='))?.split('=')[1];
    
    if (dashboardUrl) {
      this.dashboardUrl = dashboardUrl;
    }
    
    switch (command) {
      case 'create':
      case 'c':
        const serverName = args[1];
        if (serverName) {
          try {
            const linkData = await this.createServerLink(serverName);
            log.success(`Server link created: ${serverName}`);
            console.log('');
            console.log('Run this command on your remote server:');
            console.log(`${colors.green}${linkData.linkCommand}${colors.reset}`);
          } catch (error) {
            log.error(`Error: ${error.message}`);
          }
        } else {
          return this.interactive();
        }
        break;
        
      case 'list':
      case 'ls':
      case 'l':
        return this.listServers();
        
      case 'help':
      case 'h':
      default:
        this.showHelp();
        break;
    }
  }

  showHelp() {
    console.log(`\n${colors.bright}PM2 Dashboard Link Generator${colors.reset}\n`);
    console.log('Usage: node pm2-link.js <command> [options]\n');
    console.log('Commands:');
    console.log('  create, c [name]   Create new server link (interactive if no name)');
    console.log('  list, ls, l        List all linked servers');
    console.log('  help, h            Show this help\n');
    console.log('Options:');
    console.log('  --url=<url>        Dashboard URL (default: http://localhost:3000)\n');
    console.log('Examples:');
    console.log('  node pm2-link.js create production-server');
    console.log('  node pm2-link.js create --url=https://my-dashboard.com');
    console.log('  node pm2-link.js list');
    console.log('  node pm2-link.js  # Interactive mode\n');
  }
}

// Run CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const generator = new PM2LinkGenerator();
  
  if (args.length === 0) {
    generator.interactive();
  } else {
    generator.cli(args);
  }
}

module.exports = PM2LinkGenerator;
