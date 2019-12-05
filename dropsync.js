// usage: node dropsync.js | less -r

const fs = require('fs');
const $path = require('path');
const crypto = require('crypto')
const ProgressBar = require('progress');

const { promisify } = require('util')
const readdirP = promisify(fs.readdir)
const statP = promisify(fs.stat)

// if (process.argv.length <= 2) {
//     console.log("Usage: " + __filename + " path/to/directory");
//     process.exit(-1);
// }
// let path = process.argv[2];

let leftRoot = '/Volumes/Mead/Dropbox'
let rightRoot = '/Volumes/Untitled/Users/alex/Dropbox'
// let leftRoot = '/Volumes/Untitled/Users/alex/Dropbox/1Password.agilekeychain'
// let rightRoot = '/Volumes/Mead/Dropbox/1Password.agilekeychain'

let progressBar = null;
let count = 0;

run()

const skip = new Set([
  '.dropbox',
  '.dropbox.attr',
  '.tmp',
  'tmp',
  '.dropbox.cache',
  '.git',
  '.bundle',
  '.idea',
  '.sass-cache',
  '.DS_Store',
  'node_modules',
  'Icon\r',
  'desktop.ini',

  'Metadata', // weird OSX package-dir-file glitch
  'Jim Dooley Pix',
  'huh',
])


async function run() {
  let left = await scan(leftRoot)
  console.log('\n');

  let right = await scan(rightRoot)
  console.log('\n');

  let all = merge(left, right)

  for (let file of all) {
    if (!same(file.leftInfo, file.rightInfo)) {
      if (file.rightInfo) {
        show(file)
      }
    }
  }
}

// thanks https://gist.github.com/timoxley/0cb5053dec107499c8aabad8dfd651ea#gistcomment-2672424
async function scan(root, dir = '.', allFiles = {}) {
  let files = await readdirP($path.join(root, dir))

  if (dir == '.') {  // top level
    count = 0  // todo: pass count around, don't use a global
    progressBar = new ProgressBar(`Scanning ${root}: :bar :percent :count entries` , 
    {
      total: files.length,
    })
  }

  count += files.length
  progressBar.tick(0, {count: count})

  await Promise.all(
    files.map(
      async f => {
        if (skip.has(f)) return;

        // console.log(f)
        const partialPath = $path.join(dir, f);
        let fullPath = $path.join(root, dir, f);
        let stats = await statP(fullPath)
        if (stats.isDirectory()) {
          allFiles[partialPath] = {
            dir: true
          }
          await scan(root, partialPath, allFiles)
        } else {
          allFiles[partialPath] = {
            size: stats.size, mtime: stats.mtime
          }
        }

        if (dir == '.') { // only tick top-level entries
          progressBar.tick();
        }

      }
    )
  )
  return allFiles
}

function merge(left, right) {
  let all = []
  for (let [path, leftInfo] of Object.entries(left)) {
    let rightInfo = right[path] || null
    if (rightInfo) {
      all.push({ path: path, leftInfo: leftInfo, rightInfo: rightInfo })
      delete right[path];
    } else {
      all.push({ path: path, leftInfo: leftInfo, rightInfo: null })
    }
  }
  for (let [path, info] of Object.entries(right)) {
    all.push({ path: path, leftInfo: null, rightInfo: info })
  }
  all.sort((a, b) => a.path.localeCompare(b.path))
  return all
}

function same(leftInfo, rightInfo) {
  // todo: checksum or diff contents to make sure
  // todo: optionally warn about different mtimes
  return (rightInfo && leftInfo && rightInfo.size == leftInfo.size);
}

function show(file) {
  let leftInfo = file.leftInfo || {}
  let rightInfo = file.rightInfo || {}

  let tag;
  if (file.leftInfo && file.rightInfo) {
    tag = '**'
  } else if (file.leftInfo) {
    tag = '<<'
  } else {
    tag = '>>'
  }

  let slash = (leftInfo.dir || rightInfo.dir) ? '/' : ''
  process.stdout.write(`[${tag}] ${file.path}${slash}`)

  if (file.leftInfo && file.rightInfo) {
    process.stdout.write('\n')
    cursorTo(8);
    process.stdout.write(showInfo(file.leftInfo))
    cursorTo(62);
    process.stdout.write(showInfo(file.rightInfo))

    // todo: interactive diff
    process.stdout.write('\n')
    console.log(`  open -W -a Meld --args \"${$path.join(leftRoot, file.path)}\" \"${$path.join(rightRoot, file.path)}\"`)
  }

  process.stdout.write('\n')

  function showInfo(info) {
    if (info) {
      if (info.dir) {
        return 'dir'
      } else {
        return `${('' + info.size).padStart(10)}b\t${info.mtime.toLocaleDateString()}`;
      }
    } else {
      return ''
    }
  }
}

function cursorTo(column) {
  process.stdout.write('\u001B[' + column + 'G');
}

function sort(object) {
  const ordered = {};
  Object.keys(object).sort().forEach(function (key) {
    ordered[key] = object[key];
  });
}

function checksum(str, algorithm, encoding) {
  return crypto
    .createHash(algorithm || 'md5')
    .update(str, 'utf8')
    .digest(encoding || 'hex')
}
