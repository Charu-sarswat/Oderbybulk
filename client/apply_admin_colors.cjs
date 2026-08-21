const fs = require('fs');
const path = require('path');

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

const files = walk(path.join(__dirname, 'src', 'admin'));

let changedCount = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Regex to match Tailwind color utility classes (e.g., bg-amber-50, text-emerald-600, border-rose-200)
  const colorPattern = /\b(bg|text|border|ring|hover:bg|hover:text|hover:border|focus:border|focus:ring)-(emerald|amber|rose|teal|blue|indigo|purple|red|green|yellow|gray|slate|zinc|stone)-([0-9]+)(\/[0-9]+)?\b/g;

  content = content.replace(colorPattern, (match, prefix, color, weight) => {
    // Replace backgrounds with white
    if (prefix.includes('bg')) {
      return `${prefix}-[white]`;
    }
    // Replace text colors with either #141B20 or #F15A25
    if (prefix.includes('text')) {
      if (weight < 500) return `${prefix}-[#141B20]`;
      return `${prefix}-[#F15A25]`;
    }
    // Replace borders/rings with orange or dark color
    if (prefix.includes('border') || prefix.includes('ring')) {
      return `${prefix}-[#F15A25]`;
    }
    return match;
  });

  // Handle some custom arbitrary colors or missing classes
  content = content.replace(/\bgray-150\b/g, 'bg-white border border-[#141B20]/10');
  content = content.replace(/#691F1A/gi, '#F15A25');
  content = content.replace(/#551915/gi, '#141B20');

  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
    console.log(`Updated admin colors in ${path.relative(__dirname, file)}`);
  }
});

console.log(`\nSuccess! Replaced all generic colors in the Admin UI across ${changedCount} files.`);
