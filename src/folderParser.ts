import { promisify } from 'util';
import * as fs from 'fs';

import { FileData } from './interfaces';

export default class FolderParser {

    rootPath: string;
    expectedFileEnding: string;
    extension: string;

    statAsync = promisify(fs.stat);
    readdirAsync = promisify(fs.readdir);

    constructor(rootPath: string, extension: string) {
        this.rootPath = rootPath;
        this.extension = extension;
        this.expectedFileEnding = `.${this.extension}`;
    }

    public parseFolder = (): Promise<FileData[]> => this.dirBfs([this.rootPath], []);

    private dirBfs = (dirs: string[], files: FileData[]): Promise<FileData[]> => {

        if(dirs.length === 0) return new Promise((resolve, reject) => {
            resolve(files);
        });
    
        const curPath = dirs.shift() || '';
    
        return new Promise((resolve, reject) => {
            this.statAsync(curPath).then(stat => {
                if(stat.isDirectory()) {
                    this.readdirAsync(curPath).then(dirItems => {
                        dirItems.forEach(item => {
                            dirs.push(`${curPath}/${item}`);
                        });
        
                        return resolve(this.dirBfs(dirs, files));
                    })
                    .catch(err => reject(err));
                    
                } else {
                    const fileEnding = curPath.substr(curPath.length - this.expectedFileEnding.length);
    
                    if(fileEnding === this.expectedFileEnding) {
                        files.push({ 
                            fileName: curPath.substring(curPath.lastIndexOf('/') + 1, curPath.indexOf(fileEnding)), 
                            filePath: curPath,
                            extension: this.extension
                        });
                    }
        
                    return resolve(this.dirBfs(dirs, files));
                }
            })
            .catch(err => reject(err));
        });
    };
}
