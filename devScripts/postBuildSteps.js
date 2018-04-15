const fs = require('fs');
const promisify = require('util').promisify;

const statAsync = promisify(fs.stat);
const renameAsync = promisify(fs.rename);

statAsync('./lib/index.js').then(stats => {
    renameAsync('./lib/index.js', './lib/index').then(res => console.log('Done!')).catch(err => `Failed to rename file ${err}`);
}).catch(err => {
    console.log(`Failed to find index.js. ${err}`);
});
