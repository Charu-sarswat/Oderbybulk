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

  // Find <button ... className="..."> and force the background and text colors
  content = content.replace(/<button([\s\S]*?)className="([^"]*)"([\s\S]*?)>/gi, (match, p1, classes, p3) => {
    let newClasses = classes;
    
    // Strip out any existing background colors
    newClasses = newClasses.replace(/bg-\[#[A-Fa-f0-9]+\](?:\/\d+)?/g, '');
    newClasses = newClasses.replace(/hover:bg-\[#[A-Fa-f0-9]+\](?:\/\d+)?/g, '');
    newClasses = newClasses.replace(/bg-(?:emerald|amber|red|gray|blue)-\d+(?:\/\d+)?/g, '');
    newClasses = newClasses.replace(/hover:bg-(?:emerald|amber|red|gray|blue)-\d+(?:\/\d+)?/g, '');
    newClasses = newClasses.replace(/bg-(?:white|black|transparent)/g, '');
    newClasses = newClasses.replace(/bg-\[(?:white|black|transparent)\](?:\/\d+)?/g, '');
    newClasses = newClasses.replace(/hover:bg-\[(?:white|black|transparent)\](?:\/\d+)?/g, '');
    
    // Strip out any existing text colors
    newClasses = newClasses.replace(/text-\[#[A-Fa-f0-9]+\](?:\/\d+)?/g, '');
    newClasses = newClasses.replace(/hover:text-\[#[A-Fa-f0-9]+\](?:\/\d+)?/g, '');
    newClasses = newClasses.replace(/text-(?:emerald|amber|red|gray|blue)-\d+(?:\/\d+)?/g, '');
    newClasses = newClasses.replace(/hover:text-(?:emerald|amber|red|gray|blue)-\d+(?:\/\d+)?/g, '');
    newClasses = newClasses.replace(/text-(?:white|black)/g, '');
    newClasses = newClasses.replace(/text-\[(?:white|black)\](?:\/\d+)?/g, '');
    newClasses = newClasses.replace(/hover:text-\[(?:white|black)\](?:\/\d+)?/g, '');

    // Strip out any borders that might conflict
    newClasses = newClasses.replace(/border-\[#[A-Fa-f0-9]+\](?:\/\d+)?/g, '');
    newClasses = newClasses.replace(/border-\[(?:white|black)\](?:\/\d+)?/g, '');
    newClasses = newClasses.replace(/border-(?:emerald|amber|red|gray|blue)-\d+(?:\/\d+)?/g, '');
    
    // Inject the new guaranteed styles
    newClasses = `bg-[#F15A25] text-white hover:brightness-110 border-0 ${newClasses}`.replace(/\s+/g, ' ').trim();
    
    return `<button${p1}className="${newClasses}"${p3}>`;
  });

  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
    console.log(`Updated buttons in ${path.relative(__dirname, file)}`);
  }
});

console.log(`\nSuccess! Updated buttons in ${changedCount} files.`);
