const fs = require('fs');
const path = require('path');

function replaceL1WithL2(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('l1.png')) {
    content = content.replace(/l1\.png/g, 'l2.png');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated: " + filePath);
  }
}

function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      walk(file);
    } else { 
      if (file.endsWith('.jsx') || file.endsWith('.js')) {
        replaceL1WithL2(file);
      }
    }
  });
}

walk(__dirname + '/src');
