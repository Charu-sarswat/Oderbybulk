const fs = require('fs');
const path = require('path');

const DIRS = [
  path.join(__dirname, 'client', 'src'),
  path.join(__dirname, 'server')
];

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        results = results.concat(walkDir(file));
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.html') || file.endsWith('.json') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

let allFiles = [];
DIRS.forEach(dir => {
  if (fs.existsSync(dir)) {
    allFiles = allFiles.concat(walkDir(dir));
  }
});

let modifiedCount = 0;
allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Match "Bombay Chowpati" or "BOMBAY CHOWPATI" or "Bombay chowpati"
  const regex = /Bombay Chowpati/gi;
  if (regex.test(content)) {
    const newContent = content.replace(regex, match => {
      // Preserve case if it's all uppercase
      if (match === 'BOMBAY CHOWPATI') return 'ORDER BY BULK';
      return 'Order By Bulk';
    });
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedCount++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Replaced brand name in ${modifiedCount} files.`);
