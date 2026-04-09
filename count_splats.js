const fs = require('fs');
const path = require('path');

const splatsDir = path.join(__dirname, 'splats');

function getSplatCount(filePath) {
  try {
    const buffer = Buffer.alloc(4096);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 4096, 0);
    fs.closeSync(fd);

    const headerChunk = buffer.toString('utf8');
    
    const match = headerChunk.match(/element vertex (\d+)/);
    
    return match ? parseInt(match[1], 10) : 'Count not found in header';
  } catch (err) {
    return `Error reading file: ${err.message}`;
  }
}

if (!fs.existsSync(splatsDir)) {
  console.error(`Directory not found: ${splatsDir}`);
  process.exit(1);
}

const files = fs.readdirSync(splatsDir).filter(file => file.toLowerCase().endsWith('.ply'));

if (files.length === 0) {
  console.log("No .ply files found in the assets/splats directory.");
} else {
  console.log('--- Splat Counts ---');
  files.forEach(file => {
    const fullPath = path.join(splatsDir, file);
    const count = getSplatCount(fullPath);
    const formattedCount = typeof count === 'number' ? count.toLocaleString() : count;
    console.log(`${file}: ${formattedCount} splats`);
  });
  console.log('--------------------');
}