#!/usr/bin/env node

/**
 * PM2 Ecosystem Generator CLI
 * Generate PM2 ecosystem files and deploy applications
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

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

class PM2Generator {
  constructor() {
    this.templates = {
      'node': this.nodeTemplate,
      'express': this.expressTemplate,
      'react': this.reactTemplate,
      'vue': this.vueTemplate,
      'nextjs': this.nextjsTemplate,
      'api': this.apiTemplate,
      'worker': this.workerTemplate,
      'microservice': this.microserviceTemplate
    };
  }

  // Application templates
  nodeTemplate(name, options = {}) {
    return {
      name: name || 'node-app',
      script: options.script || 'index.js',
      cwd: options.cwd || './',
      instances: options.instances || 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: options.port || 3000,
        ...options.env
      },
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    };
  }

  expressTemplate(name, options = {}) {
    return {
      ...this.nodeTemplate(name, options),
      name: name || 'express-app',
      script: options.script || 'app.js',
      instances: options.instances || 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: options.port || 3000,
        ...options.env
      }
    };
  }

  reactTemplate(name, options = {}) {
    return {
      name: name || 'react-app',
      script: 'npx serve -s build',
      cwd: options.cwd || './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: options.port || 3000,
        ...options.env
      },
      max_memory_restart: '500M',
      autorestart: true,
      watch: false
    };
  }

  vueTemplate(name, options = {}) {
    return {
      name: name || 'vue-app',
      script: 'npx serve -s dist',
      cwd: options.cwd || './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: options.port || 3000,
        ...options.env
      },
      max_memory_restart: '500M',
      autorestart: true,
      watch: false
    };
  }

  nextjsTemplate(name, options = {}) {
    return {
      name: name || 'nextjs-app',
      script: 'npm start',
      cwd: options.cwd || './',
      instances: options.instances || 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: options.port || 3000,
        ...options.env
      },
      max_memory_restart: '1G',
      autorestart: true,
      watch: false
    };
  }

  apiTemplate(name, options = {}) {
    return {
      name: name || 'api-server',
      script: options.script || 'server.js',
      cwd: options.cwd || './',
      instances: options.instances || 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: options.port || 3001,
        API_KEY: 'your-api-key',
        DATABASE_URL: 'your-database-url',
        ...options.env
      },
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      error_file: './logs/api-err.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log'
    };
  }

  workerTemplate(name, options = {}) {
    return {
      name: name || 'worker',
      script: options.script || 'worker.js',
      cwd: options.cwd || './',
      instances: options.instances || 2,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'background',
        ...options.env
      },
      max_memory_restart: '512M',
      autorestart: true,
      watch: false,
      restart_delay: 4000
    };
  }

  microserviceTemplate(name, options = {}) {
    return {
      name: name || 'microservice',
      script: options.script || 'service.js',
      cwd: options.cwd || './',
      instances: options.instances || 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: options.port || 3002,
        SERVICE_NAME: name || 'microservice',
        ...options.env
      },
      max_memory_restart: '800M',
      autorestart: true,
      watch: false,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    };
  }

  // Generate ecosystem file
  generateEcosystem(apps, deployConfig = null) {
    const config = { apps };
    
    if (deployConfig) {
      config.deploy = deployConfig;
    }

    const content = `module.exports = {
  apps: [
${apps.map(app => this.formatApp(app)).join(',\n')}
  ]${deployConfig ? `,\n  deploy: ${JSON.stringify(deployConfig, null, 4)}` : ''}
};`;

    return content;
  }

  formatApp(app) {
    const formatValue = (value) => {
      if (typeof value === 'string') return `'${value}'`;
      if (typeof value === 'object' && value !== null) {
        return `{\n${Object.entries(value).map(([k, v]) => `      ${k}: '${v}'`).join(',\n')}\n    }`;
      }
      return value;
    };

    const lines = Object.entries(app).map(([key, value]) => {
      return `      ${key}: ${formatValue(value)}`;
    });

    return `    {\n${lines.join(',\n')}\n    }`;
  }

  // Create deployment configuration
  createDeployConfig(environments) {
    const deploy = {};
    
    environments.forEach(env => {
      deploy[env.name] = {
        user: env.user || 'deploy',
        host: env.host,
        ref: env.ref || 'origin/main',
        repo: env.repo,
        path: env.path,
        'post-deploy': env.postDeploy || 'npm install && pm2 reload ecosystem.config.js --env production',
        env: env.env || {}
      };
    });

    return deploy;
  }

  // Interactive CLI
  async interactive() {
    log.title('🚀 PM2 Ecosystem Generator');
    console.log('');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

    try {
      // App configuration
      const appName = await question('App name: ') || 'my-app';
      console.log('');
      
      log.info('Available templates:');
      Object.keys(this.templates).forEach((template, index) => {
        console.log(`  ${index + 1}. ${template}`);
      });
      console.log('');
      
      const templateChoice = await question('Select template (1-8): ') || '1';
      const templateNames = Object.keys(this.templates);
      const selectedTemplate = templateNames[parseInt(templateChoice) - 1] || 'node';
      
      const script = await question(`Script file [index.js]: `) || 'index.js';
      const instances = await question(`Instances [1]: `) || '1';
      const port = await question(`Port [3000]: `) || '3000';
      
      // Generate app config
      const templateFunc = this.templates[selectedTemplate];
      const appConfig = templateFunc.call(this, appName, {
        script,
        instances: instances === 'max' ? 'max' : parseInt(instances),
        port: parseInt(port)
      });

      // Generate ecosystem
      const ecosystemContent = this.generateEcosystem([appConfig]);
      
      // Save file
      const filename = 'ecosystem.config.js';
      fs.writeFileSync(filename, ecosystemContent);
      
      log.success(`Ecosystem file created: ${filename}`);
      
      // Ask to start
      const shouldStart = await question('Start the application now? (y/n): ');
      
      if (shouldStart.toLowerCase() === 'y') {
        log.info('Starting application with PM2...');
        try {
          const { stdout } = await execAsync(`pm2 start ${filename}`);
          log.success('Application started successfully!');
          console.log(stdout);
          
          // Show status
          const { stdout: status } = await execAsync('pm2 status');
          console.log('\n' + status);
        } catch (error) {
          log.error(`Failed to start application: ${error.message}`);
        }
      }
      
    } catch (error) {
      log.error(`Error: ${error.message}`);
    } finally {
      rl.close();
    }
  }

  // Command line interface
  async cli(args) {
    const command = args[0];
    
    switch (command) {
      case 'generate':
      case 'g':
        return this.interactive();
        
      case 'template':
      case 't':
        const templateType = args[1];
        const appName = args[2] || 'my-app';
        
        if (!this.templates[templateType]) {
          log.error(`Unknown template: ${templateType}`);
          log.info('Available templates: ' + Object.keys(this.templates).join(', '));
          return;
        }
        
        const config = this.templates[templateType].call(this, appName);
        const content = this.generateEcosystem([config]);
        
        console.log(content);
        break;
        
      case 'list':
      case 'l':
        log.info('Available templates:');
        Object.keys(this.templates).forEach(template => {
          console.log(`  - ${template}`);
        });
        break;
        
      case 'help':
      case 'h':
      default:
        this.showHelp();
        break;
    }
  }

  showHelp() {
    console.log(`
${colors.bright}PM2 Ecosystem Generator${colors.reset}
`);
    console.log('Usage: node pm2-generator.js <command> [options]\n');
    console.log('Commands:');
    console.log('  generate, g    Interactive ecosystem generator');
    console.log('  template, t    Generate template: template <type> [name]');
    console.log('  list, l        List available templates');
    console.log('  help, h        Show this help\n');
    console.log('Templates:');
    Object.keys(this.templates).forEach(template => {
      console.log(`  - ${template}`);
    });
    console.log('\nExamples:');
    console.log('  node pm2-generator.js generate');
    console.log('  node pm2-generator.js template express my-api');
    console.log('  node pm2-generator.js list\n');
  }
}

// Run CLI
if (require.main === module) {
  const generator = new PM2Generator();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    generator.interactive();
  } else {
    generator.cli(args);
  }
}

module.exports = PM2Generator;
