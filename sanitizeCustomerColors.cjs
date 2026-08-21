const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'client/src/customer');

function sanitizeColors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Hex replacements
  content = content.replace(/#FFF9EE/gi, '#D4D4D0');
  content = content.replace(/#691F1A/gi, '#181817');
  content = content.replace(/#551915/gi, '#181817');
  content = content.replace(/#616161/gi, '#D4D4D0');
  content = content.replace(/#E53935/gi, '#181817');
  content = content.replace(/#43A047/gi, '#181817');

  // Tailwind class replacements (Backgrounds)
  content = content.replace(/bg-white/g, 'bg-[#D4D4D0]');
  content = content.replace(/bg-gray-[0-9]{2,3}/g, 'bg-[#D4D4D0]');
  content = content.replace(/bg-red-[0-9]{2,3}/g, 'bg-[#181817]');
  content = content.replace(/bg-green-[0-9]{2,3}/g, 'bg-[#181817]');
  content = content.replace(/bg-blue-[0-9]{2,3}/g, 'bg-[#181817]');
  content = content.replace(/bg-emerald-[0-9]{2,3}/g, 'bg-[#181817]');
  content = content.replace(/bg-amber-[0-9]{2,3}/g, 'bg-[#181817]');
  content = content.replace(/bg-yellow-[0-9]{2,3}/g, 'bg-[#181817]');

  // Tailwind class replacements (Text)
  content = content.replace(/text-white/g, 'text-[#D4D4D0]');
  content = content.replace(/text-gray-[0-9]{2,3}/g, 'text-[#181817]');
  content = content.replace(/text-red-[0-9]{2,3}/g, 'text-[#181817]');
  content = content.replace(/text-green-[0-9]{2,3}/g, 'text-[#181817]');
  content = content.replace(/text-blue-[0-9]{2,3}/g, 'text-[#181817]');
  content = content.replace(/text-emerald-[0-9]{2,3}/g, 'text-[#181817]');
  content = content.replace(/text-amber-[0-9]{2,3}/g, 'text-[#181817]');
  content = content.replace(/text-yellow-[0-9]{2,3}/g, 'text-[#181817]');

  // Tailwind class replacements (Borders)
  content = content.replace(/border-white/g, 'border-[#D4D4D0]');
  content = content.replace(/border-gray-[0-9]{2,3}/g, 'border-[#181817]');
  content = content.replace(/border-red-[0-9]{2,3}/g, 'border-[#181817]');
  content = content.replace(/border-green-[0-9]{2,3}/g, 'border-[#181817]');
  content = content.replace(/border-blue-[0-9]{2,3}/g, 'border-[#181817]');
  content = content.replace(/border-emerald-[0-9]{2,3}/g, 'border-[#181817]');
  content = content.replace(/border-amber-[0-9]{2,3}/g, 'border-[#181817]');
  content = content.replace(/border-yellow-[0-9]{2,3}/g, 'border-[#181817]');
  
  // Tailwind hover states
  content = content.replace(/hover:bg-gray-[0-9]{2,3}/g, 'hover:bg-[#D4D4D0]/80');
  content = content.replace(/hover:bg-red-[0-9]{2,3}/g, 'hover:bg-[#181817]');
  content = content.replace(/hover:bg-green-[0-9]{2,3}/g, 'hover:bg-[#181817]');
  content = content.replace(/hover:text-red-[0-9]{2,3}/g, 'hover:text-[#181817]');

  fs.writeFileSync(filePath, content, 'utf8');
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      sanitizeColors(fullPath);
    }
  }
}

processDirectory(directoryPath);
console.log('Customer colors sanitized.');
