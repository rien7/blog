const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { execSync } = require('child_process');

function getAllFiles(dir, exts) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      // 跳过 node_modules 目录
      if (file === 'node_modules') return;
      results = results.concat(getAllFiles(filePath, exts));
    } else if (exts.includes(path.extname(file))) {
      results.push(filePath);
    }
  });
  return results;
}

function getFirstCommitTimestamp(filePath) {
  try {
    const output = execSync(`git log --diff-filter=A --follow --format=%at -- ${filePath} | tail -1`, { encoding: 'utf8' });
    return parseInt(output.trim(), 10) * 1000;
  } catch (e) {
    return null;
  }
}

function collectMetadata() {
  const root = path.resolve(process.cwd());
  const files = getAllFiles(root, ['.md', '.mdx']);
  const result = files.map(file => {
    const raw = fs.readFileSync(file, 'utf8');
    const { data } = matter(raw);
    let name = data.title || path.basename(file);
    let date;
    if (data.date) {
      const d = new Date(data.date);
      date = d.getTime();
    } else {
      date = getFirstCommitTimestamp(file);
    }
    return {
      id: path.basename(file),
      name,
      date
    };
  });
  fs.writeFileSync(path.join(__dirname, 'blog-metadata.json'), JSON.stringify(result, null, 2));
}

collectMetadata();
