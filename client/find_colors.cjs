const fs = require('fs');
const path = require('path');

function extractColors(dir, colorsSet = new Set()) {
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      extractColors(file, colorsSet);
    } else { 
      if (file.endsWith('.jsx') || file.endsWith('.js')) {
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(/#[0-9A-Fa-f]{3,6}/g);
        if (matches) {
          matches.forEach(m => colorsSet.add(m.toUpperCase()));
        }
      }
    }
  });
  return colorsSet;
}

const adminDir = path.join(__dirname, 'src', 'admin');
const colors = extractColors(adminDir);
console.log(Array.from(colors));
