import * as yargs from 'yargs';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import chalk from 'chalk';
import FolderParser from './folderParser';
import FileParser from './fileParser';

import { FileData } from './interfaces';

console.log(chalk.blue('Entering App...'));

const workPath = 'D:/test/testapp/testapp/Models'; // Input dir
const outputPath = 'D:/test'; // Output dir

const fParser = new FileParser('utf8');

fs.stat(workPath, (err, stats) => {
    if(err) {
        console.log(chalk.red(`${err}`));
    } else {
        new FolderParser(workPath, 'cs').parseFolder().then(result => {

            fParser.dfsParse(result);

            // result.forEach(fileData => {
                
            //     fParser.parseFile(fileData.filePath).then(fileData => {
            //         mkdirp(outputPath, (err) => {
            //             if(err) {
            //                 console.log(`${err}`);
            //             } else {
            //                 fs.writeFile(`${outputPath}/${fileData.fileName}.ts`, fileData.fileContent, 'utf8', (err) => {
            //                     if(err) {
            //                         console.log(chalk.red(`${err}`));
            //                     } else {
            //                         console.log(chalk.yellow(`File ${fileData.fileName} created!`));
            //                     }
            //                 });
            //             }
            //         });
            //     })
            //     .catch(err => console.log(`${err}`));
            // });
        });
    }
});