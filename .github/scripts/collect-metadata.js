const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { execSync } = require('child_process');

function getAllFolders(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file === 'node_modules') return;
      if (file.startsWith(".")) return;
      results.push(filePath);
    }
  });
  return results;
}

function getAllFiles(dir, exts) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      // 跳过 node_modules 目录
      if (file === 'node_modules') return;
      if (file.startsWith(".")) return;
      results = results.concat(getAllFiles(filePath, exts));
    } else if (exts.includes(path.extname(file))) {
      if (file.startsWith(".")) return;
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

function getLastCommitTimestamp(filePath) {
  try {
    const output = execSync(`git log -1 --format=%at -- ${filePath}`, { encoding: 'utf8' });
    return parseInt(output.trim(), 10) * 1000;
  } catch (e) {
    return null;
  }
}

function collectMetadata() {
  const root = path.resolve(process.cwd());
  const folders = getAllFolders(root)
  let result = []
  for (const folder of folders) {
    const files = getAllFiles(folder, ['.md', '.mdx']);
    const metas = files.map(file => {
      const raw = fs.readFileSync(file, 'utf8');
      const { data } = matter(raw);
      let name = data.title || path.basename(file);
      let description = data.description
      let type = folder.split("/")
      type = type[type.length - 1]
      let date;
      let update_date;
      if (data.date) {
        const d = new Date(data.date);
        date = d.getTime();
      } else {
        date = getFirstCommitTimestamp(file);
      }
      if (data.update_date) {
        const d = new Date(data.date);
        update_date = d.getTime();
      } else {
        update_date = getLastCommitTimestamp(file)
      }
      return {
        id: path.basename(file),
        name,
        description,
        date,
        update_date,
        type
      };
    });
    result = result.concat(...metas)
  }
  // delete undefined
  result.forEach(res => {
    for (const [k, v] of Object.entries(res)) {
      if (!v) {
        delete res[k]
      }
    }
  })
  fs.writeFileSync(path.join(__dirname, 'metadata.json'), JSON.stringify(result, null, 2));
}

collectMetadata();
