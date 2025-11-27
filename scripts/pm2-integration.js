#!/usr/bin/env node

/**
 * PM2 Integration Script
 * This script demonstrates how to integrate the dashboard with real PM2 data
 */

const pm2 = require('pm2');
const os = require('os');

class PM2Integration {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      pm2.connect((err) => {
        if (err) {
          console.error('Failed to connect to PM2:', err.message);
          reject(err);
          return;
        }
        this.isConnected = true;
        console.log('✅ Connected to PM2');
        resolve();
      });
    });
  }

  async disconnect() {
    if (this.isConnected) {
      pm2.disconnect();
      this.isConnected = false;
      console.log('📤 Disconnected from PM2');
    }
  }

  async getProcessList() {
    return new Promise((resolve, reject) => {
      pm2.describe('all', (err, processDescriptionList) => {
        if (err) {
          reject(err);
          return;
        }

        const processes = processDescriptionList.map(proc => ({
          pid: proc.pid,
          name: proc.name,
          pm_id: proc.pm_id,
          status: proc.pm2_env.status,
          restart_time: proc.pm2_env.restart_time,
          created_at: proc.pm2_env.created_at,
          pm2_env: {
            status: proc.pm2_env.status,
            instances: proc.pm2_env.instances || 1,
            pm_exec_path: proc.pm2_env.pm_exec_path,
            pm_cwd: proc.pm2_env.pm_cwd,
            exec_interpreter: proc.pm2_env.exec_interpreter,
            pm_out_log_path: proc.pm2_env.pm_out_log_path,
            pm_err_log_path: proc.pm2_env.pm_err_log_path,
            pm_pid_path: proc.pm2_env.pm_pid_path,
            username: proc.pm2_env.username,
            merge_logs: proc.pm2_env.merge_logs,
            vizion_running: proc.pm2_env.vizion_running,
            created_at: proc.pm2_env.created_at,
            pm_uptime: proc.pm2_env.pm_uptime,
            unstable_restarts: proc.pm2_env.unstable_restarts,
            restart_time: proc.pm2_env.restart_time,
            axm_actions: proc.pm2_env.axm_actions || [],
            axm_monitor: proc.pm2_env.axm_monitor || {},
            axm_options: proc.pm2_env.axm_options || {},
            axm_dynamic: proc.pm2_env.axm_dynamic || {},
            vizion: proc.pm2_env.vizion,
            node_version: proc.pm2_env.node_version
          },
          monit: {
            memory: proc.monit ? proc.monit.memory : 0,
            cpu: proc.monit ? proc.monit.cpu : 0
          }
        }));

        resolve(processes);
      });
    });
  }

  getSystemInfo() {
    return {
      hostname: os.hostname(),
      uptime: os.uptime(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      loadavg: os.loadavg(),
      cpu_count: os.cpus().length
    };
  }

  async getPM2Data() {
    try {
      const processes = await this.getProcessList();
      const system = this.getSystemInfo();
      
      return {
        processes,
        system,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to get PM2 data: ${error.message}`);
    }
  }

  async executeAction(action, processId) {
    return new Promise((resolve, reject) => {
      switch (action) {
        case 'start':
          pm2.restart(processId, (err) => {
            if (err) reject(err);
            else resolve(`Started process ${processId}`);
          });
          break;
        
        case 'stop':
          pm2.stop(processId, (err) => {
            if (err) reject(err);
            else resolve(`Stopped process ${processId}`);
          });
          break;
        
        case 'restart':
          pm2.restart(processId, (err) => {
            if (err) reject(err);
            else resolve(`Restarted process ${processId}`);
          });
          break;
        
        case 'delete':
          pm2.delete(processId, (err) => {
            if (err) reject(err);
            else resolve(`Deleted process ${processId}`);
          });
          break;
        
        default:
          reject(new Error(`Unknown action: ${action}`));
      }
    });
  }

  async getLogs(processId, lines = 100) {
    return new Promise((resolve, reject) => {
      pm2.describe(processId, (err, processDescription) => {
        if (err) {
          reject(err);
          return;
        }

        if (processDescription.length === 0) {
          reject(new Error(`Process ${processId} not found`));
          return;
        }

        const proc = processDescription[0];
        const logPath = proc.pm2_env.pm_out_log_path;
        
        // In a real implementation, you would read the log file
        // For now, return a placeholder
        resolve({
          stdout: `Log entries for ${proc.name} would be here`,
          stderr: '',
          logPath
        });
      });
    });
  }
}

// Example usage
async function example() {
  const pm2Integration = new PM2Integration();
  
  try {
    await pm2Integration.connect();
    
    // Get current PM2 data
    const data = await pm2Integration.getPM2Data();
    console.log('📊 PM2 Data:');
    console.log(`- Processes: ${data.processes.length}`);
    console.log(`- System: ${data.system.hostname}`);
    console.log(`- Memory: ${(data.system.freemem / data.system.totalmem * 100).toFixed(1)}% free`);
    
    // List processes
    console.log('\n🔄 Processes:');
    data.processes.forEach(proc => {
      console.log(`- ${proc.name} (${proc.pm_id}): ${proc.status} - CPU: ${proc.monit.cpu}% - Memory: ${(proc.monit.memory / 1024 / 1024).toFixed(1)}MB`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pm2Integration.disconnect();
  }
}

// Run example if script is executed directly
if (require.main === module) {
  example();
}

module.exports = PM2Integration;
