const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  if (content.match(/#3c110d/i) || content.match(/#A97E16/i)) {
    content = content.replace(/#3c110d/gi, '#181817');
    content = content.replace(/#A97E16/gi, '#D4D4D0');
    fs.writeFileSync(filePath, content, 'utf8');
    changed = true;
  }
  return changed;
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else { 
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.css') || file.endsWith('.html')) {
        results.push(file);
      }
    }
  });
  return results;
}

const srcDir = path.join(__dirname, 'src');
const files = walk(srcDir);
files.push(path.join(__dirname, 'index.html'));

let changedCount = 0;
files.forEach(file => {
  if(replaceInFile(file)) {
    console.log("Updated: " + file);
    changedCount++;
  }
});

console.log(`Total files updated: ${changedCount}`);
