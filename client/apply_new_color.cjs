const fs = require('fs');
const path = require('path');

function replaceColorsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // A mapping of old colors to the new ones
  const colorMap = {
    '#F15A25': '#A97E16', // Primary Orange
    '#F8A324': '#A97E16', // Saffron
    '#E08A0A': '#A97E16', // Hover Saffron
    '#FFB74D': '#A97E16', // Amber
    '#ea580c': '#A97E16', // Tailwind orange-600
    '#f97316': '#A97E16', // Tailwind orange-500
    '#fb923c': '#A97E16', // Tailwind orange-400
  };

  // Replace each color case-insensitively
  for (const [oldColor, newColor] of Object.entries(colorMap)) {
    const regex = new RegExp(oldColor, 'gi');
    content = content.replace(regex, newColor);
  }

  // Also replace literal tailwind classes if any were added
  content = content.replace(/text-orange-\d+/g, 'text-[#A97E16]');
  content = content.replace(/bg-orange-\d+/g, 'bg-[#A97E16]');
  content = content.replace(/border-orange-\d+/g, 'border-[#A97E16]');
  content = content.replace(/ring-orange-\d+/g, 'ring-[#A97E16]');

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

const clientDir = __dirname;
const files = walk(clientDir);

let changedCount = 0;
files.forEach(file => {
  if (replaceColorsInFile(file)) {
    console.log("Updated: " + file);
    changedCount++;
  }
});

console.log(`Total files updated: ${changedCount}`);
