const fs = require('fs');
const promisify = require('util').promisify;

const del = require('del');

const statAsync = promisify(fs.stat);

statAsync('./lib').then(stats => {
    console.log('Clearing lib directory...');
    del('./lib').then(paths => {
        console.log('Lib directory removed.');
    });
}).catch(err => {
    console.log('Lib directory not found.');
});