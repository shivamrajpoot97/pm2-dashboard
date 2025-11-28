import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Check if running on Vercel or in demo mode
const isVercelOrDemo = process.env.VERCEL_ENV || process.env.DEMO_MODE === 'true';

// Generate mock log data for demo mode
function generateMockLogs(processId: string, action: string) {
  if (action === 'view') {
    const mockLogs = [
      `[${new Date().toISOString()}] PM2 | App [demo-process-${processId}] online`,
      `[${new Date(Date.now() - 60000).toISOString()}] APP | Server started on port 3000`,
      `[${new Date(Date.now() - 120000).toISOString()}] APP | Database connection established`,
      `[${new Date(Date.now() - 180000).toISOString()}] APP | Loading configuration...`,
      `[${new Date(Date.now() - 240000).toISOString()}] APP | Application initialized`,
      `[${new Date(Date.now() - 300000).toISOString()}] PM2 | App [demo-process-${processId}] starting`,
    ];
    
    return mockLogs.reverse().join('\n');
  }
  
  return 'Demo: Logs cleared successfully';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const processId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const lines = searchParams.get('lines') || '50';
    
    // Return demo logs if in Vercel/demo mode
    if (isVercelOrDemo) {
      const mockLogs = generateMockLogs(processId, 'view');
      return NextResponse.json({
        success: true,
        data: {
          logs: mockLogs,
          processId,
          lines: parseInt(lines),
          demoMode: true
        }
      });
    }
    
    // Get logs using PM2
    try {
      const { stdout } = await execAsync(`pm2 logs ${processId} --lines ${lines} --nostream --raw`);
      
      return NextResponse.json({
        success: true,
        data: {
          logs: stdout,
          processId,
          lines: parseInt(lines)
        }
      });
    } catch (error: any) {
      // If pm2 logs command fails, try alternative approach
      const { stdout: processList } = await execAsync('pm2 jlist');
      const processes = JSON.parse(processList);
      const process = processes.find((p: any) => p.pm_id === parseInt(processId));
      
      if (!process) {
        return NextResponse.json(
          { success: false, error: 'Process not found' },
          { status: 404 }
        );
      }
      
      // Try to read log files directly
      const outLogPath = process.pm2_env?.pm_out_log_path;
      const errLogPath = process.pm2_env?.pm_err_log_path;
      
      let logs = '';
      
      if (outLogPath) {
        try {
          const { stdout: outLogs } = await execAsync(`tail -n ${lines} "${outLogPath}" 2>/dev/null || echo ""`);
          if (outLogs) logs += `=== OUTPUT LOGS ===\n${outLogs}\n`;
        } catch {}
      }
      
      if (errLogPath && errLogPath !== outLogPath) {
        try {
          const { stdout: errLogs } = await execAsync(`tail -n ${lines} "${errLogPath}" 2>/dev/null || echo ""`);
          if (errLogs) logs += `=== ERROR LOGS ===\n${errLogs}\n`;
        } catch {}
      }
      
      return NextResponse.json({
        success: true,
        data: {
          logs: logs || 'No logs available',
          processId,
          lines: parseInt(lines)
        }
      });
    }
  } catch (error: any) {
    console.error('Logs API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch logs',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const processId = resolvedParams.id;
    
    // Return demo response if in Vercel/demo mode
    if (isVercelOrDemo) {
      const mockResponse = generateMockLogs(processId, 'clear');
      return NextResponse.json({
        success: true,
        message: mockResponse,
        processId,
        demoMode: true
      });
    }
    
    // Clear logs using PM2
    const { stdout } = await execAsync(`pm2 flush ${processId}`);
    
    return NextResponse.json({
      success: true,
      message: `Logs cleared for process ${processId}`,
      output: stdout,
      processId
    });
  } catch (error: any) {
    console.error('Clear Logs API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear logs',
        message: error.message 
      },
      { status: 500 }
    );
  }
}