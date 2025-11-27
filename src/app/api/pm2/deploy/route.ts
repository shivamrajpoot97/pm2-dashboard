import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface ProcessConfig {
  name: string;
  script: string;
  cwd?: string;
  args?: string[];
  instances?: number | 'max';
  exec_mode?: 'fork' | 'cluster';
  env?: Record<string, string>;
  log_file?: string;
  out_file?: string;
  error_file?: string;
  pid_file?: string;
  max_memory_restart?: string;
  node_args?: string[];
  merge_logs?: boolean;
  watch?: boolean | string[];
  ignore_watch?: string[];
  autorestart?: boolean;
  max_restarts?: number;
  min_uptime?: string;
  kill_timeout?: number;
  wait_ready?: boolean;
  listen_timeout?: number;
  reload_delay?: number;
  restart_delay?: number;
}

interface EcosystemConfig {
  apps: ProcessConfig[];
  deploy?: {
    [environment: string]: {
      user?: string;
      host?: string;
      ref?: string;
      repo?: string;
      path?: string;
      'post-deploy'?: string;
      'pre-deploy-local'?: string;
      env?: Record<string, string>;
    };
  };
}

// POST endpoint to create and start new processes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    switch (action) {
      case 'start-simple':
        return await startSimpleProcess(config);
      case 'start-ecosystem':
        return await startFromEcosystem(config);
      case 'generate-ecosystem':
        return await generateEcosystemFile(config);
      case 'start-from-package-json':
        return await startFromPackageJson(config);
      case 'quick-start':
        return await quickStartApp(config);
      default:
        throw new Error(`Unknown deployment action: ${action}`);
    }
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Deployment failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// Start a simple process
async function startSimpleProcess(config: {
  name: string;
  script: string;
  cwd?: string;
  instances?: number;
  env?: Record<string, string>;
}) {
  const { name, script, cwd = process.cwd(), instances = 1, env = {} } = config;
  
  // Build PM2 start command
  let command = `pm2 start "${script}" --name "${name}"`;
  
  if (instances > 1) {
    command += ` --instances ${instances}`;
  }
  
  if (cwd && cwd !== process.cwd()) {
    command = `cd "${cwd}" && ${command}`;
  }
  
  // Add environment variables
  const envVars = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
  
  if (envVars) {
    command = `${envVars} ${command}`;
  }
  
  try {
    const { stdout, stderr } = await execAsync(command);
    
    return NextResponse.json({
      success: true,
      message: `Process '${name}' started successfully`,
      output: stdout,
      error: stderr,
      command
    });
  } catch (error: any) {
    throw new Error(`Failed to start process: ${error.message}`);
  }
}

// Generate and start from ecosystem file
async function startFromEcosystem(config: EcosystemConfig) {
  const ecosystemPath = path.join(process.cwd(), 'temp-ecosystem.config.js');
  
  try {
    // Generate ecosystem file content
    const ecosystemContent = `module.exports = ${JSON.stringify(config, null, 2)};`;
    
    // Write ecosystem file
    await fs.writeFile(ecosystemPath, ecosystemContent);
    
    // Start processes from ecosystem
    const { stdout, stderr } = await execAsync(`pm2 start "${ecosystemPath}"`);
    
    // Clean up temp file
    await fs.unlink(ecosystemPath);
    
    return NextResponse.json({
      success: true,
      message: 'Processes started from ecosystem configuration',
      output: stdout,
      error: stderr,
      config
    });
  } catch (error: any) {
    // Clean up temp file on error
    try {
      await fs.unlink(ecosystemPath);
    } catch {}
    
    throw new Error(`Failed to start from ecosystem: ${error.message}`);
  }
}

// Generate ecosystem file and return it
async function generateEcosystemFile(config: EcosystemConfig) {
  const ecosystemContent = `module.exports = {
  apps: [
${config.apps.map(app => `    {
      name: '${app.name}',
      script: '${app.script}',
      cwd: '${app.cwd || './'}',
      instances: ${app.instances || 1},
      exec_mode: '${app.exec_mode || 'fork'}',
      env: {
${Object.entries(app.env || {}).map(([key, value]) => `        ${key}: '${value}'`).join(',\n')}
      },
      max_memory_restart: '${app.max_memory_restart || '1G'}',
      autorestart: ${app.autorestart !== false},
      watch: ${app.watch || false},
      max_restarts: ${app.max_restarts || 10},
      min_uptime: '${app.min_uptime || '1s'}',
      merge_logs: ${app.merge_logs !== false}
    }`).join(',\n')}
  ]${config.deploy ? `,\n  deploy: ${JSON.stringify(config.deploy, null, 4)}` : ''}
};`;

  return NextResponse.json({
    success: true,
    message: 'Ecosystem file generated',
    content: ecosystemContent,
    filename: 'ecosystem.config.js'
  });
}

// Start from package.json
async function startFromPackageJson(config: {
  path: string;
  name?: string;
  script?: string;
  instances?: number;
}) {
  const { path: projectPath, name, script = 'start', instances = 1 } = config;
  
  try {
    // Read package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    
    const appName = name || packageJson.name || 'app';
    const startScript = packageJson.scripts?.[script];
    
    if (!startScript) {
      throw new Error(`Script '${script}' not found in package.json`);
    }
    
    // Determine the main file
    let mainFile = packageJson.main || 'index.js';
    if (startScript.includes('node ')) {
      const match = startScript.match(/node\s+([^\s]+)/);
      if (match) {
        mainFile = match[1];
      }
    }
    
    const command = `cd "${projectPath}" && pm2 start "${mainFile}" --name "${appName}" --instances ${instances}`;
    
    const { stdout, stderr } = await execAsync(command);
    
    return NextResponse.json({
      success: true,
      message: `Application '${appName}' started from package.json`,
      output: stdout,
      error: stderr,
      packageInfo: {
        name: packageJson.name,
        version: packageJson.version,
        main: mainFile,
        scripts: packageJson.scripts
      }
    });
  } catch (error: any) {
    throw new Error(`Failed to start from package.json: ${error.message}`);
  }
}

// Quick start with templates
async function quickStartApp(config: {
  type: 'express' | 'react' | 'vue' | 'node' | 'nextjs' | 'custom';
  name: string;
  port?: number;
  instances?: number;
  env?: Record<string, string>;
  script?: string;
}) {
  const { type, name, port = 3000, instances = 1, env = {} } = config;
  
  let script = '';
  let additionalEnv = {};
  
  // Templates for different app types
  switch (type) {
    case 'express':
      script = 'npm start';
      additionalEnv = { PORT: port.toString(), NODE_ENV: 'production' };
      break;
    case 'react':
      script = 'npm run build && npx serve -s build';
      additionalEnv = { PORT: port.toString() };
      break;
    case 'vue':
      script = 'npm run build && npx serve -s dist';
      additionalEnv = { PORT: port.toString() };
      break;
    case 'nextjs':
      script = 'npm run build && npm start';
      additionalEnv = { PORT: port.toString(), NODE_ENV: 'production' };
      break;
    case 'node':
      script = 'node index.js';
      additionalEnv = { PORT: port.toString(), NODE_ENV: 'production' };
      break;
    case 'custom':
      script = config.script || 'npm start';
      break;
    default:
      throw new Error(`Unknown app type: ${type}`);
  }
  
  const finalEnv = { ...additionalEnv, ...env };
  
  const processConfig: ProcessConfig = {
    name,
    script,
    instances: instances > 1 ? instances : 1,
    exec_mode: instances > 1 ? 'cluster' : 'fork',
    env: finalEnv,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10
  };
  
  return await startFromEcosystem({ apps: [processConfig] });
}

// GET endpoint to list available templates and get deployment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'templates':
        return NextResponse.json({
          success: true,
          templates: [
            {
              type: 'express',
              name: 'Express.js Server',
              description: 'Node.js web application framework',
              defaultScript: 'npm start',
              defaultPort: 3000
            },
            {
              type: 'react',
              name: 'React Application',
              description: 'Build and serve React application',
              defaultScript: 'npm run build && npx serve -s build',
              defaultPort: 3000
            },
            {
              type: 'vue',
              name: 'Vue.js Application',
              description: 'Build and serve Vue.js application',
              defaultScript: 'npm run build && npx serve -s dist',
              defaultPort: 3000
            },
            {
              type: 'nextjs',
              name: 'Next.js Application',
              description: 'React framework with SSR',
              defaultScript: 'npm run build && npm start',
              defaultPort: 3000
            },
            {
              type: 'node',
              name: 'Node.js Application',
              description: 'Simple Node.js application',
              defaultScript: 'node index.js',
              defaultPort: 3000
            },
            {
              type: 'custom',
              name: 'Custom Application',
              description: 'Define your own start script',
              defaultScript: 'npm start',
              defaultPort: 3000
            }
          ]
        });
        
      case 'ecosystem-example':
        return NextResponse.json({
          success: true,
          example: {
            apps: [
              {
                name: 'my-app',
                script: './app.js',
                instances: 'max',
                exec_mode: 'cluster',
                env: {
                  NODE_ENV: 'production',
                  PORT: '3000'
                },
                env_development: {
                  NODE_ENV: 'development',
                  PORT: '3001'
                },
                max_memory_restart: '1G',
                autorestart: true,
                watch: false,
                max_restarts: 10,
                min_uptime: '10s'
              }
            ],
            deploy: {
              production: {
                user: 'deploy',
                host: 'your-server.com',
                ref: 'origin/main',
                repo: 'git@github.com:username/repo.git',
                path: '/var/www/production',
                'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
              }
            }
          }
        });
        
      default:
        return NextResponse.json({
          success: true,
          message: 'PM2 Deployment API',
          endpoints: {
            'POST /api/pm2/deploy': 'Deploy applications',
            'GET /api/pm2/deploy?action=templates': 'Get app templates',
            'GET /api/pm2/deploy?action=ecosystem-example': 'Get ecosystem example'
          }
        });
    }
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
