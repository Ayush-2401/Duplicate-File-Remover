const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const { Worker } = require('worker_threads');

let mainWindow;

// ─── Window Creation ────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

// ─── Window Controls ─────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

// ─── Folder Picker ───────────────────────────────────────────────────────────
ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'multiSelections'],
    title: 'Select Source Folders',
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('pick-destination', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Destination Folder',
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('open-folder', async (_, folderPath) => {
  shell.openPath(folderPath);
});

// ─── File Scanning ───────────────────────────────────────────────────────────
ipcMain.handle('scan-folders', async (event, { sourceFolders, recursive }) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'scannerWorker.js'));
    
    worker.on('message', (msg) => {
      if (msg.type === 'progress') {
        mainWindow.webContents.send('scan-progress', { count: msg.count, status: msg.status });
      } else if (msg.type === 'done') {
        resolve(msg.result);
      } else if (msg.type === 'error') {
        reject(new Error(msg.error));
      }
    });
    
    worker.on('error', (err) => reject(err));
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
    
    worker.postMessage({ sourceFolders, recursive });
  });
});

// ─── Consolidation ───────────────────────────────────────────────────────────
let cancelRequested = false;

ipcMain.on('cancel-consolidation', () => {
  cancelRequested = true;
});

ipcMain.handle('consolidate-files', async (_, { uniqueFiles, destination, mode, onConflict }) => {
  cancelRequested = false;
  const total = uniqueFiles.length;
  let copied = 0;
  let skipped = 0;
  let errors = 0;
  const startTime = Date.now();

  // Ensure destination exists
  try {
    await fsp.mkdir(destination, { recursive: true });
  } catch (e) {
    mainWindow.webContents.send('consolidate-error', `Cannot create destination: ${e.message}`);
    return;
  }

  for (let i = 0; i < uniqueFiles.length; i++) {
    if (cancelRequested) {
      mainWindow.webContents.send('consolidate-cancelled', { copied, skipped, errors });
      return;
    }

    const file = uniqueFiles[i];
    let destName = file.name;
    let destPath = path.join(destination, destName);

    // Check if destination already has a file with same name
    if (fs.existsSync(destPath)) {
      const destStat = fs.statSync(destPath);
      if (destStat.size === file.size) {
        // Exact duplicate already in destination — skip
        skipped++;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = (copied + skipped) / elapsed || 1;
        const eta = Math.max(0, (total - i - 1) / speed);
        mainWindow.webContents.send('consolidate-progress', {
          current: i + 1, total, copied, skipped, errors,
          currentFile: file.name, status: 'skipped',
          sourcePath: file.path, destPath,
          elapsed, eta, speed,
        });
        continue;
      } else {
        // Same name, different size — auto-rename
        const ext = path.extname(file.name);
        const base = path.basename(file.name, ext);
        let counter = 2;
        while (fs.existsSync(path.join(destination, `${base}_${counter}${ext}`))) {
          counter++;
        }
        destName = `${base}_${counter}${ext}`;
        destPath = path.join(destination, destName);
      }
    }

    try {
      if (mode === 'move') {
        await fsp.rename(file.path, destPath).catch(async () => {
          // Cross-device move: copy then delete
          await fsp.copyFile(file.path, destPath);
          await fsp.unlink(file.path);
        });
      } else {
        await fsp.copyFile(file.path, destPath);
      }
      copied++;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = copied / elapsed || 1;
      const eta = Math.max(0, (total - i - 1) / speed);
      mainWindow.webContents.send('consolidate-progress', {
        current: i + 1, total, copied, skipped, errors,
        currentFile: destName, status: 'copied',
        sourcePath: file.path, destPath,
        elapsed, eta, speed,
      });
    } catch (err) {
      errors++;
      mainWindow.webContents.send('consolidate-progress', {
        current: i + 1, total, copied, skipped, errors,
        currentFile: file.name, status: 'error',
        sourcePath: file.path, destPath,
        elapsed: (Date.now() - startTime) / 1000, eta: 0, speed: 0,
        errorMsg: err.message,
      });
    }
  }

  mainWindow.webContents.send('consolidate-done', { copied, skipped, errors, destination });
});
