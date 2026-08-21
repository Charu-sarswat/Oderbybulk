const fs = require('fs');
const path = require('path');

function replaceColorsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // A mapping of old colors to the new ones
  const colorMap = {
    '#616161': '#181817', // Dark Grey -> Dark Charcoal
    '#260907': '#181817', // Dark Maroon -> Dark Charcoal
    '#691F1A': '#181817', // Primary Maroon -> Dark Charcoal
    '#551915': '#181817', // Hover Maroon -> Dark Charcoal
    '#3C110D': '#181817', // Another Maroon -> Dark Charcoal
    '#000000': '#181817', // Black -> Dark Charcoal
    '#1A0A09': '#181817', // Very Dark Maroon -> Dark Charcoal
    '#111827': '#181817', // Tailwind Gray-900 -> Dark Charcoal
    
    '#FFF9EE': '#D4D4D0', // Light Saffron -> Light Silver
    '#FFFFFF': '#D4D4D0', // White -> Light Silver
    '#FFB74D': '#D4D4D0', // Amber-300 -> Light Silver
    '#F8A324': '#D4D4D0', // Primary Saffron -> Light Silver
    '#E08A0A': '#D4D4D0', // Hover Saffron -> Light Silver
    '#FDF4F3': '#D4D4D0', // Light Maroon -> Light Silver
    '#F3EFE9': '#D4D4D0', // Light Charcoal -> Light Silver
    '#FBF9F7': '#D4D4D0'  // Lighter Charcoal -> Light Silver
  };

  // Replace each color case-insensitively
  for (const [oldColor, newColor] of Object.entries(colorMap)) {
    const regex = new RegExp(oldColor, 'gi');
    content = content.replace(regex, newColor);
  }

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

const adminDir = path.join(__dirname, 'src', 'admin');
const files = walk(adminDir);

let changedCount = 0;
files.forEach(file => {
  if (replaceColorsInFile(file)) {
    console.log("Updated: " + file);
    changedCount++;
  }
});

console.log(`Total admin files updated: ${changedCount}`);
