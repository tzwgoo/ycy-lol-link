const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// 判断是否是打包后的环境
const isPackaged = app.isPackaged;
// 判断是否是开发模式（通过环境变量）
const isDev = process.env.NODE_ENV === 'development' || !isPackaged;

// 获取服务器根目录路径
function getServerRoot() {
  if (isPackaged) {
    // 打包后: resources/server
    return path.join(process.resourcesPath, 'server');
  } else {
    // 开发模式: ../server
    return path.join(__dirname, '../server');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // 允许跨域请求，确保API请求正常工作
    },
    icon: path.join(__dirname, '../build/public/vite.svg'),
    show: false
  });

  // 检查服务器是否启动，然后加载页面
  let checkCount = 0;
  const maxChecks = 30; // 最多检查30次，每次间隔1秒
  let serverConnected = false; // 标记是否已连接成功

  // 根据模式决定加载的 URL 和端口
  const loadURL = isDev ? 'http://localhost:5173' : 'http://localhost:3000';
  const checkPort = isDev ? 5173 : 3000;
  const serverName = isDev ? 'Vite 开发服务器' : '后端服务器';

  console.log(`运行模式: ${isDev ? '开发模式' : '生产模式'}`);
  console.log(`将加载: ${loadURL}`);

  const checkServer = () => {
    if (serverConnected) return; // 已连接成功，不再检查

    checkCount++;
    console.log(`检查${serverName}启动状态 (${checkCount}/${maxChecks})...`);

    // 尝试连接服务器
    const http = require('http');
    const req = http.request({
      hostname: 'localhost',
      port: checkPort,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      if (serverConnected) return; // 防止重复处理
      serverConnected = true;

      console.log(`${serverName}已启动，状态码:`, res.statusCode);
      console.log('正在加载页面:', loadURL);
      mainWindow.loadURL(loadURL)
        .then(() => {
          console.log('页面加载成功');
          mainWindow.show();

          // 开发模式下自动打开开发者工具
          if (isDev) {
            mainWindow.webContents.openDevTools();
          }
        })
        .catch((urlError) => {
          console.error('页面加载失败:', urlError);
          showErrorPage(urlError);
        });
    });

    req.on('error', (err) => {
      if (serverConnected) return;
      console.log(`${serverName}尚未启动:`, err.message);
      if (checkCount < maxChecks) {
        setTimeout(checkServer, 1000); // 1秒后再次检查
      } else {
        console.error(`${serverName}启动超时`);
        showErrorPage(new Error(`${serverName}启动超时，请检查服务器配置`));
      }
    });

    req.on('timeout', () => {
      req.destroy();
      if (serverConnected) return;
      if (checkCount < maxChecks) {
        setTimeout(checkServer, 1000);
      } else {
        showErrorPage(new Error(`${serverName}启动超时`));
      }
    });

    req.end();
  };
  
  const showErrorPage = (error) => {
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>应用加载失败</h1>
          <p>无法连接到服务器，请检查：</p>
          <ul>
            <li>服务器是否正常启动</li>
            <li>端口3000是否被占用</li>
            <li>防火墙设置是否正确</li>
            <li>服务器文件是否存在</li>
          </ul>
          <p>错误信息: ${error.message}</p>
          <p>请检查控制台输出以获取更多信息</p>
        </body>
      </html>
    `));
    mainWindow.show();
  };
  
  // 延迟2秒后开始检查服务器状态
  setTimeout(checkServer, 2000);

  // 开发模式下打开开发者工具（生产环境注释掉）
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
    }
  });
}

function startServer() {
  const serverRoot = getServerRoot();
  const serverPath = path.join(serverRoot, 'dist/index.js');
  const configPath = path.join(serverRoot, 'config.yaml');
  const packagedNodePath = path.join(process.resourcesPath || '', 'node', process.platform === 'win32' ? 'node.exe' : 'node');
  const nodeBinary = isPackaged && require('fs').existsSync(packagedNodePath) ? packagedNodePath : 'node';

  // 确定数据存储目录
  let dataDir;
  if (isPackaged) {
    // 打包环境：使用可执行文件所在目录旁的 data 文件夹
    const exePath = app.getPath('exe');
    const appDir = path.dirname(exePath);
    dataDir = path.join(appDir, 'data');
  } else {
    // 开发环境：使用项目根目录下的 data 文件夹
    dataDir = path.join(__dirname, '../data');
  }

  // 确保数据目录存在
  const fs = require('fs');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('是否打包环境:', isPackaged);
  console.log('启动服务器:', serverPath);
  console.log('服务器路径存在:', fs.existsSync(serverPath));
  console.log('配置文件路径:', configPath);
  console.log('配置文件存在:', fs.existsSync(configPath));
  console.log('使用的 node 可执行文件:', nodeBinary);
  console.log('数据存储目录:', dataDir);

  // 确保工作目录位于server根目录，便于访问public等资源
  const serverDir = serverRoot;
  console.log('使用服务器工作目录:', serverDir);

  serverProcess = spawn(nodeBinary, [serverPath], {
    stdio: 'pipe', // pipe 便于在当前进程里输出日志且不弹控制台
    shell: false,
    cwd: serverDir,
    windowsHide: true, // 避免在 Windows 弹出额外的控制台窗口
    env: {
      ...process.env,
      ELECTRON_ENV: 'true',
      ELECTRON_DATA_DIR: dataDir
    }
  });

  serverProcess.on('error', (error) => {
    console.error('启动服务器失败:', error);
  });

  serverProcess.on('close', (code) => {
    console.log(`服务器进程退出，代码: ${code}`);
  });
  
  // 监听服务器输出
  serverProcess.stdout?.on('data', (data) => {
    console.log(`服务器输出: ${data}`);
  });
  
  serverProcess.stderr?.on('data', (data) => {
    console.error(`服务器错误: ${data}`);
  });
}

app.whenReady().then(() => {
  // 启动后端服务器
  startServer();
  
  // 创建主窗口
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 设置菜单
const template = [
  {
    label: '文件',
    submenu: [
      {
        label: '退出',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: '开发',
    submenu: [
      {
        label: '开发者工具',
        accelerator: 'F12',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
          }
        }
      },
      {
        label: '重新加载',
        accelerator: 'F5',
        click: () => {
          if (mainWindow) {
            mainWindow.reload();
          }
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
