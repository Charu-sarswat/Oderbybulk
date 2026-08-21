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
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
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

  // Replace background and text colors inside ALL <button> tags
  // Using a regex to match the entire button tag opening
  content = content.replace(/<button([^>]*)>/gi, (match, p1) => {
    let newProps = p1;
    // Replace dark background with Orange
    newProps = newProps.replace(/bg-\[#141B20\]/g, 'bg-[#F15A25]');
    // Replace white background with Orange
    newProps = newProps.replace(/bg-white/g, 'bg-[#F15A25]');
    newProps = newProps.replace(/bg-\[white\]/g, 'bg-[#F15A25]');
    // Change dark text to white text so it's readable on Orange
    newProps = newProps.replace(/text-\[#141B20\]/g, 'text-white');
    // Change transparent hover effects to something simpler or leave them
    return `<button${newProps}>`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
});

console.log('Updated ' + changedCount + ' files to make all buttons orange!');
