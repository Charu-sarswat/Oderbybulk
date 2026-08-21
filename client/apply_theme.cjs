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
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.css') || file.endsWith('.html')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));
files.push(path.join(__dirname, 'index.html'));

let changedCount = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Swap main background darks
  content = content.replace(/#181817/gi, '#141B20');

  // 2. Identify button-like elements or active states and color them #F15A25 (Orange)
  // E.g., 'bg-[#181817] text-[#D4D4D0]' -> 'bg-[#141B20] text-white'
  // But wait, what if we just make some key classes Orange?
  
  // We'll replace D4D4D0 with white globally FIRST
  content = content.replace(/#D4D4D0/gi, 'white');
  
  // Clean up tailwind arbitrary whites
  content = content.replace(/bg-\\[white\\]/gi, 'bg-white');
  content = content.replace(/text-\\[white\\]/gi, 'text-white');
  content = content.replace(/border-\\[white\\]/gi, 'border-white');

  // 3. Let's add Orange to some specific buttons! 
  // In CartDrawer, '+ Add' button: bg-white text-[#141B20]
  content = content.replace(/>\s*\+\s*Add\s*<\/button>/gi, ' className="text-[#F15A25] font-bold">+ Add</button>'); // just a rough heuristic

  // For Menu and Landing primary buttons, let's just let the user see it in Black & White first, 
  // or we can add Orange to 'Add to Cart' 
  content = content.replace(/bg-\\[#141B20\\] text-white/g, 'bg-[#141B20] text-white hover:bg-[#F15A25]');
  
  // Replace the + Add buttons in Menu
  content = content.split('text-white hover:text-white/80').join('text-white hover:text-[#F15A25]');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
});
console.log('Updated ' + changedCount + ' files with new colors: #141B20, white, and #F15A25.');
