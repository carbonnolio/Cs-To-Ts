import * as yargs from 'yargs';
import * as fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';

import FolderParser from './folderParser';
import FileParser from './fileParser';
import FileGenerator from './fileGenerator';

console.log(chalk.blue('Entering App...'));

const workPath = 'D:/test/testapp/testapp/Models'; // Input dir
const outputPath = 'D:/test'; // Output dir

const statAsync = promisify(fs.stat);

statAsync(workPath).then(stats => {
    new FolderParser(workPath, 'cs').parseFolder().then(result => {

        new FileParser('utf8').parse(result).then(tsProps => {

            new FileGenerator().populateTsFiles(tsProps, 'D:/test/interfaces').then(res => console.log(res));
        });
    });
}).catch(err => 
    console.log(chalk.red(`${err}`))
);