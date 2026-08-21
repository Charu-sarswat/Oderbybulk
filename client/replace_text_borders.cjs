const fs = require('fs');
const path = require('path');

function replaceTextAndBorders(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Replace black and gray text classes
  content = content.replace(/\btext-black\b/g, 'text-[#181817]');
  content = content.replace(/\btext-gray-\d{3}\b/g, 'text-[#181817]');
  content = content.replace(/\btext-slate-\d{3}\b/g, 'text-[#181817]');
  content = content.replace(/\btext-zinc-\d{3}\b/g, 'text-[#181817]');
  content = content.replace(/\btext-neutral-\d{3}\b/g, 'text-[#181817]');

  // Replace black and gray border classes
  content = content.replace(/\bborder-black\b/g, 'border-[#181817]');
  content = content.replace(/\bborder-gray-\d{3}\b/g, 'border-[#181817]');
  content = content.replace(/\bborder-slate-\d{3}\b/g, 'border-[#181817]');
  content = content.replace(/\bborder-zinc-\d{3}\b/g, 'border-[#181817]');
  content = content.replace(/\bborder-neutral-\d{3}\b/g, 'border-[#181817]');

  // Replace divide classes (used for borders between table rows/items)
  content = content.replace(/\bdivide-gray-\d{3}\b/g, 'divide-[#181817]');
  content = content.replace(/\bdivide-slate-\d{3}\b/g, 'divide-[#181817]');

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
      // Skip node_modules and dist
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
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
  if (replaceTextAndBorders(file)) {
    console.log("Updated: " + file);
    changedCount++;
  }
});

console.log(`Total files updated with Dark Charcoal text/borders: ${changedCount}`);
