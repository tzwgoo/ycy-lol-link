const { spawn } = require('child_process');
const path = require('path');

// 设置环境变量
process.env.ELECTRON_ENV = 'true';
process.env.NODE_ENV = 'development';

let frontendProcess = null;
let backendProcess = null;
let electronProcess = null;

// 清理所有进程
function cleanup() {
  console.log('\n正在清理进程...');

  if (frontendProcess) {
    console.log('停止前端服务器...');
    frontendProcess.kill();
  }

  if (backendProcess) {
    console.log('停止后端服务器...');
    backendProcess.kill();
  }

  if (electronProcess) {
    console.log('停止 Electron...');
    electronProcess.kill();
  }

  process.exit(0);
}

// 监听退出信号
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

console.log('=== 启动开发环境 ===\n');

// 1. 启动前端开发服务器 (Vite)
console.log('1. 启动前端开发服务器 (Vite)...');
frontendProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'pipe',
  shell: true
});

frontendProcess.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Local:') || output.includes('ready in')) {
    console.log('[前端] ' + output.trim());
  }
});

frontendProcess.stderr.on('data', (data) => {
  console.error('[前端错误] ' + data.toString().trim());
});

frontendProcess.on('error', (error) => {
  console.error('启动前端服务器失败:', error);
  cleanup();
});

// 2. 启动后端服务器
console.log('2. 启动后端服务器...');
backendProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'pipe',
  shell: true
});

backendProcess.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Server') || output.includes('listening') || output.includes('started')) {
    console.log('[后端] ' + output.trim());
  }
});

backendProcess.stderr.on('data', (data) => {
  console.error('[后端错误] ' + data.toString().trim());
});

backendProcess.on('error', (error) => {
  console.error('启动后端服务器失败:', error);
  cleanup();
});

// 3. 等待服务器启动后再启动 Electron
console.log('3. 等待服务器启动...\n');
setTimeout(() => {
  console.log('4. 启动 Electron...\n');
  electronProcess = spawn('electron', [path.join(__dirname, '.')], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  electronProcess.on('error', (error) => {
    console.error('启动 Electron 失败:', error);
    cleanup();
  });

  electronProcess.on('close', (code) => {
    console.log(`\nElectron 进程退出，代码: ${code}`);
    cleanup();
  });
}, 5000); // 等待5秒让服务器启动