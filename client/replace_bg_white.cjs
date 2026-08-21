const fs = require('fs');
const path = require('path');

function replaceWhiteBackgrounds(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Replace bg-white with bg-[#D4D4D0]
  content = content.replace(/\bbg-white\b/g, 'bg-[#D4D4D0]');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const srcDir = path.join(__dirname, 'src');
const files = walk(srcDir);

let changedCount = 0;
files.forEach(file => {
  if (replaceWhiteBackgrounds(file)) {
    console.log("Updated: " + file);
    changedCount++;
  }
});

console.log(`Total files updated: ${changedCount}`);
