import { promisify } from 'util';
import * as fs from 'fs';

import { FileData, CsProperty, CsModelData } from './interfaces';

export default class FileParser {

    encoding: string;

    csCommonTypeMap = {
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
        bool: 'boolean',
        datetime: 'string'
    };

    csArrayTypes = ['List', 'Stack', 'Queue', 'IEnumerable', 'IList', 'ICollection'];

    tsModels: any[] = [];

    readFileAsync = promisify(fs.readFile);

    constructor(encoding: string) {
        this.encoding = encoding;
    }

    public dfsParse = (files: FileData[]) => {
        //console.log(models);

        const modelPromises = files.map(fileData => new Promise<(CsModelData | null)[]>((resolve, reject) => {
            this.readFileAsync(fileData.filePath, this.encoding).then(content => {
                if(content.indexOf('namespace') > -1) {
                    const openNs = content.indexOf('{');
                    const closeNs = content.lastIndexOf('}');
    
                    const classes = content.substring(openNs + 1, closeNs).trim().split('public class').filter(x => x.length > 0 ).map(x => x.trim());

                    const csModels = classes.map(entity => {
                        const openCl = entity.indexOf('{');
                        const closeCl = entity.lastIndexOf('}');
    
                        if(openCl > -1 && closeCl > -1) {
                            const entityName = entity.substring(0, openCl).trim();
                            const entityContent = entity.substring(openCl + 1, closeCl).trim().split(/[\s]+/);

                            return {
                                modelName: entityName,
                                modelContent: this.propArray(entityContent, [])
                            };
                        }

                        return null;
                    });

                    resolve(csModels);
                }
            });
        }));

        Promise.all(modelPromises).then(models => {
            const flatCsModels = models.reduce((prev, curr) => prev.concat(curr), []).filter(model => model !== null);

            flatCsModels.forEach(model => console.log(model));
        });
    };

    toTsModel = (csModel: CsModelData, filesData: FileData[]) => {
        // const model = csModels.shift();

        // if(model) {
        //     const tsProps = model.content.map(csProp => {
        //         const tsPropName = this.pascalToCamel(csProp.propName);
        //         let tsPropType = this.mapPrimitiveType(csProp.propType);

        //         let csFileData;

        //         if(tsPropType === 'unresolved') {
                    
        //             csFileData = files.find(fileData => fileData.fileName === csProp.propType);
        //         }

        //         return {
        //             imports: csFileData ? [csProp.propName] : [],
        //             pType: csFileData ? csProp.propType : tsPropType,
        //             propName: tsPropName,
        //             isArray: csProp.isArray
        //         };
        //     });

        //     console.log(tsProps);
        // }
    };

    public parseFile = (filePath = ''): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.readFileAsync(filePath, this.encoding).then(content => {

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
                            
                            const tsPropArray = this.propArray(entityContent, []);
                            
                            const tsString = this.toTsString(entityName, tsPropArray);
    
                            return resolve({
                                fileName: entityName,
                                fileContent: tsString
                            });
                        }
                    });
                }
            })
            .catch(err => reject(err));
        });
    };

    private propArray = (content: string[], arr: CsProperty[]): CsProperty[] => {
        const hasPublicProp = content.some(x => x === 'public');
    
        if(!hasPublicProp) return arr;
    
        const pStart = content.indexOf('public');
        const pEnd = content.indexOf('const') > -1 ? content.findIndex(x => x.indexOf(';') > -1) : content.indexOf('}');
        
        if(pStart > -1 && pEnd > -1) {
            const propData = content.slice(pStart + 1, pEnd);
    
            if(propData.some(x => x.toLowerCase() === 'get;' || x.toLowerCase() === 'set;' || x.toLowerCase() === 'get' || x.toLowerCase() === 'set')) {
                
                const filteredData = propData.filter(x => x !== 'static');
    
                const isPropArray = this.isCsArrayType(filteredData);
    
                arr.push({
                    propType: isPropArray.arrType || filteredData[0],
                    propName: isPropArray.name || filteredData[1],
                    isArray: isPropArray.isArray
                });
            }
    
            this.propArray(content.slice(pEnd + 1, content.length), arr);
        }
    
        return arr;
    };
    
    private isCsArrayType = (propData: string[]): any => {
    
        const propString = propData.slice(0, propData.indexOf('{')).join('');
        
        if(propString.indexOf('[]') > -1) {
            return {
                isArray: true,
                arrType: propString.substring(0, propString.indexOf('[')),
                name: propString.substr(propString.indexOf(']') + 1)
            };
        }
    
        const isCollection = propString.match(/\<(?:<[^<>]+?>|[^<>\,])+?>/);
    
        if(isCollection && isCollection.length > 0 && this.csArrayTypes.some(x => x === propData[0])) {
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
    
    private mapPrimitiveType = (csType: string): string => this.csCommonTypeMap[csType.toLowerCase()] || 'unresolved';
    
    private pascalToCamel = (str: string) => str ? str.replace(/^(?:[A-Z])+(?=[A-Z])|^[A-Z]/, x => x.toLowerCase()) : null;
    
    private toTsString = (name: string, csProps: any[]) => {
        const header = `export interface ${name} {\n`;
        const footer = '}';
    
        const tsProps = csProps.reduce((prev, curr) => 
            `${prev}\t${this.pascalToCamel(curr.propName)}: ${this.mapPrimitiveType(curr.propType)}${curr.isArray ? '[]' : ''};\n`, ''
        );
    
        return `${header}${tsProps}${footer}`;
    };
}