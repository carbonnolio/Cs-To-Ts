import * as yargs from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import chalk from 'chalk';
import FolderParser from './folderParser';

console.log(chalk.blue('Entering App...'));

const workPath = ''; // Input dir
const outputPath = ''; // Output dir

const csArrayTypes = ['List', 'Stack', 'Queue', 'IEnumerable', 'IList', 'ICollection'];

const csPrimitiveTypeMap = {
    byte: 'number',
    sbyte: 'number',
    decimal: 'number',
    double: 'number',
    float: 'number',
    int: 'number',
    uint: 'number',
    long: 'number',
    ulong: 'number',
    short: 'number',
    ushort: 'number',
    string: 'string',
    char: 'string',
    guid: 'string',
    bool: 'boolean'
};

fs.stat(workPath, (err, stats) => {
    if(err) {
        console.log(chalk.red(`${err}`));
    } else {
        new FolderParser(workPath, 'cs').parseFolder().then(result => {
            result.forEach(fileData => {
                fs.readFile(fileData.filePath, 'utf8', (err, content) => {

                    let file;
                    
                    if(content.indexOf('namespace') > -1) {
                        const openNs = content.indexOf('{');
                        const closeNs = content.lastIndexOf('}');

                        const classes = content.substring(openNs + 1, closeNs).trim().split('public class').filter(x => x.length > 0 ).map(x => x.trim());

                        classes.forEach(entity => {
                            const openCl = entity.indexOf('{');
                            const closeCl = entity.lastIndexOf('}');

                            if(openCl > -1 && closeCl > -1) {
                                const entityName = entity.substring(0, openCl).trim();
                                const entityContent = entity.substring(openCl + 1, closeCl).trim().split(/[\s]+/);
                                
                                const tsPropArray = propArray(entityContent, []);
                                
                                const tsString = toTsString(entityName, tsPropArray);

                                file = {
                                    fileName: entityName,
                                    fileContent: tsString
                                };
                            }
                        });
                    }

                    mkdirp(outputPath, (err) => {
                        if(err) {
                            console.log(`${err}`);
                        } else {
                            fs.writeFile(`${outputPath}/${file.fileName}.ts`, file.fileContent, 'utf8', (err) => {
                                if(err) {
                                    console.log(chalk.red(`${err}`));
                                } else {
                                    console.log(chalk.yellow(`File ${file.fileName} created!`));
                                }
                            });
                        }
                    });
                });
            });
        });
    }
});

const propArray = (content: string[], arr: any[]): any[] => {
    const hasPublicProp = content.some(x => x === 'public');

    if(!hasPublicProp) return arr;

    const pStart = content.indexOf('public');
    const pEnd = content.indexOf('const') > -1 ? content.findIndex(x => x.indexOf(';') > -1) : content.indexOf('}');
    
    if(pStart > -1 && pEnd > -1) {
        const propData = content.slice(pStart + 1, pEnd);

        if(propData.some(x => x.toLowerCase() === 'get;' || x.toLowerCase() === 'set;' || x.toLowerCase() === 'get' || x.toLowerCase() === 'set')) {
            
            const filteredData = propData.filter(x => x !== 'static');

            const isPropArray = isCsArrayType(filteredData);

            arr.push({
                propType: isPropArray.arrType || filteredData[0],
                propName: isPropArray.name || filteredData[1],
                isArray: isPropArray.isArray
            });
        }

        propArray(content.slice(pEnd + 1, content.length), arr);
    }

    return arr;
};

const isCsArrayType = (propData: string[]): any => {

    const propString = propData.slice(0, propData.indexOf('{')).join('');
    
    if(propString.indexOf('[]') > -1) {
        return {
            isArray: true,
            arrType: propString.substring(0, propString.indexOf('[')),
            name: propString.substr(propString.indexOf(']') + 1)
        };
    }

    const isCollection = propString.match(/\<(?:<[^<>]+?>|[^<>\,])+?>/);

    if(isCollection && isCollection.length > 0 && csArrayTypes.some(x => x === propData[0])) {
        return {
            isArray: true,
            arrType: isCollection[0].substring(1, isCollection[0].length - 1),
            name: propString.substr(propString.indexOf('>') + 1)
        };
    }

    return {
        isArray: false,
        arrType: null,
        name: null
    };
}

const mapPrimitiveType = (csType: string): string => csPrimitiveTypeMap[csType.toLowerCase()] || 'any';

const pascalToCamel = (str: string) => str ? str.replace(/^(?:[A-Z])+(?=[A-Z])|^[A-Z]/, x => x.toLowerCase()) : null;

const toTsString = (name: string, csProps: any[]) => {
    const header = `export interface ${name} {\n`;
    const footer = '}';

    const tsProps = csProps.reduce((prev, curr) => `${prev}\t${pascalToCamel(curr.propName)}: ${mapPrimitiveType(curr.propType)}${curr.isArray ? '[]' : ''};\n`, '');

    return `${header}${tsProps}${footer}`;
};