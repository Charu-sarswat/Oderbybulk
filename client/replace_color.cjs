const fs = require('fs');
const path = require('path');

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
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace uppercase and lowercase variations
  content = content.replace(/#691F1A/g, '#F15A25');
  content = content.replace(/#691f1a/g, '#f15a25');
  
  // Optional: Also replace the dark hover variant of the maroon to a slightly darker orange for consistency
  content = content.replace(/#551915/g, '#D9491B'); 
  
  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
    console.log(`Updated color in ${path.relative(__dirname, file)}`);
  }
});

console.log(`\nSuccess! Replaced color in ${changedCount} files.`);
