#!/usr/bin/env node

import * as fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';

import FolderParser from './folderParser';
import FileParser from './fileParser';
import FileGenerator from './fileGenerator';
import CommandHandler from './commandHandler';

console.log(chalk.blue('Entering App...'));

const statAsync = promisify(fs.stat);

new CommandHandler().handleCommands((input, output) => {

    statAsync(input).then(stats => {
        new FolderParser(input, 'cs').parseFolder().then(result => {

            new FileParser('utf8').parse(result).then(tsProps => {
                
                new FileGenerator().populateTsFiles(tsProps, output);
            });
        });
    }).catch(err => 
        console.log(chalk.red(`${err}`))
    );
});