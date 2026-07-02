const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // Folder pickers
  pickFolder:      () => ipcRenderer.invoke('pick-folder'),
  pickDestination: () => ipcRenderer.invoke('pick-destination'),
  openFolder:      (p) => ipcRenderer.invoke('open-folder', p),

  // Scanning
  scanFolders: (opts) => ipcRenderer.invoke('scan-folders', opts),
  onScanProgress: (cb) => ipcRenderer.on('scan-progress', (_, d) => cb(d)),

  // Consolidation
  consolidateFiles: (opts) => ipcRenderer.invoke('consolidate-files', opts),
  cancelConsolidation: () => ipcRenderer.send('cancel-consolidation'),

  // Event listeners
  onProgress:  (cb) => ipcRenderer.on('consolidate-progress', (_, d) => cb(d)),
  onDone:      (cb) => ipcRenderer.on('consolidate-done',     (_, d) => cb(d)),
  onCancelled: (cb) => ipcRenderer.on('consolidate-cancelled',(_, d) => cb(d)),
  onError:     (cb) => ipcRenderer.on('consolidate-error',    (_, d) => cb(d)),

  // Cleanup listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
