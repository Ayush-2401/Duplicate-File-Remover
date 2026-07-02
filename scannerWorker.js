const { parentPort } = require('worker_threads');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

async function walkDir(dir, recursive, results = []) {
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) await walkDir(fullPath, recursive, results);
    } else if (entry.isFile()) {
      try {
        const stat = await fsp.stat(fullPath);
        results.push({
          name: entry.name,
          path: fullPath,
          size: stat.size,
          dir: dir,
        });
        
        // Report progress
        if (results.length % 500 === 0) {
          parentPort.postMessage({ type: 'progress', count: results.length, status: 'Scanning directories...' });
        }
      } catch {
        // skip unreadable files
      }
    }
  }
  return results;
}

function hashFile(filePath, maxBytes = 0) {
  return new Promise((resolve, reject) => {
    const algo = maxBytes > 0 ? 'md5' : 'sha256';
    const hasher = crypto.createHash(algo);
    
    const options = {};
    if (maxBytes > 0) {
      options.start = 0;
      options.end = maxBytes - 1;
    }
    
    const stream = fs.createReadStream(filePath, options);
    
    stream.on('data', chunk => hasher.update(chunk));
    stream.on('end', () => resolve(hasher.digest('hex')));
    stream.on('error', err => reject(err));
  });
}

parentPort.on('message', async (data) => {
  const { sourceFolders, recursive } = data;
  
  try {
    const allFiles = [];
    for (const folder of sourceFolders) {
      await walkDir(folder, recursive, allFiles);
    }
    
    parentPort.postMessage({ type: 'progress', count: allFiles.length, status: 'Grouping by size...' });
    
    // Stage 1: Group by Size
    const sizeGroups = new Map();
    for (const file of allFiles) {
      if (!sizeGroups.has(file.size)) sizeGroups.set(file.size, []);
      sizeGroups.get(file.size).push(file);
    }
    
    const uniqueFiles = [];
    const duplicates = [];
    
    let processedFiles = 0;
    
    for (const [size, files] of sizeGroups.entries()) {
      if (files.length === 1) {
        files[0].hash = `size-${size}`; 
        uniqueFiles.push(files[0]);
        processedFiles++;
        continue;
      }
      
      // Stage 2: Partial Hash (1MB)
      const partialGroups = new Map();
      for (const file of files) {
        try {
          const partialHash = await hashFile(file.path, 1024 * 1024);
          if (!partialGroups.has(partialHash)) partialGroups.set(partialHash, []);
          partialGroups.get(partialHash).push(file);
        } catch (e) {
          uniqueFiles.push(file);
        }
        processedFiles++;
        if (processedFiles % 100 === 0) {
          parentPort.postMessage({ type: 'progress', count: allFiles.length, status: `Hashing files... (${processedFiles}/${allFiles.length})` });
        }
      }
      
      // Stage 3: Full Hash for collisions
      for (const [partialHash, pFiles] of partialGroups.entries()) {
        if (pFiles.length === 1) {
          pFiles[0].hash = partialHash;
          uniqueFiles.push(pFiles[0]);
          continue;
        }
        
        const fullGroups = new Map();
        for (const file of pFiles) {
          try {
             const fullHash = await hashFile(file.path, 0); 
             if (!fullGroups.has(fullHash)) fullGroups.set(fullHash, []);
             fullGroups.get(fullHash).push(file);
          } catch (e) {
             uniqueFiles.push(file);
          }
        }
        
        for (const [fullHash, fFiles] of fullGroups.entries()) {
          if (fFiles.length > 0) {
            fFiles[0].hash = fullHash;
            uniqueFiles.push(fFiles[0]);
            
            for (let i = 1; i < fFiles.length; i++) {
              fFiles[i].hash = fullHash;
              duplicates.push(fFiles[i]);
            }
          }
        }
      }
    }
    
    parentPort.postMessage({ 
      type: 'done', 
      result: {
        totalFound: allFiles.length,
        uniqueCount: uniqueFiles.length,
        duplicateCount: duplicates.length,
        uniqueFiles,
        duplicates
      }
    });

  } catch (error) {
    parentPort.postMessage({ type: 'error', error: error.message });
  }
});
