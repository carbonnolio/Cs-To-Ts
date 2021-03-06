import { promisify } from 'util';
import * as fs from 'fs';

import { FileData, CsProperty, CsModelData, TsPropertyType, TsPropertyData, TsModelData, Nesting, PrimitiveProp } from './interfaces';

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

    public parse = (files: FileData[]): Promise<(TsModelData | null)[]> => {

        const modelPromises = files.map(fileData => new Promise<(CsModelData | null)[]>((resolve, reject) => {
            this.readFileAsync(fileData.filePath, this.encoding).then(content => {

                if(content.indexOf('namespace') > -1) {
                    const openNs = content.indexOf('{');
                    const closeNs = content.lastIndexOf('}');

                    const classes = content.substring(openNs + 1, closeNs).trim();

                    const csModels = this.findScopeElements(classes)
                        .filter(element => element.nestingLevel === 0)
                        .map((element, i, arr) => this.scopeElementsToModelData(element, i, arr, classes))
                        .filter(classData => classData != null);

                    resolve(csModels);
                }
            });
        }));

        return new Promise<(TsModelData | null)[]>((resolve, reject) => {
            Promise.all(modelPromises).then(models => {

                const flatCsModels = models.reduce((prev, curr) => prev.concat(curr), []).filter(model => model !== null);
                
                const tsModels = flatCsModels.map(model => this.toTsModel(model, files));
    
                resolve(tsModels);
            });
        });
    };

    private toTsModel = (csModel: CsModelData | null, filesData: FileData[]) : TsModelData | null => {

        if(csModel) {
            const tsProps = csModel.modelContent.map(csProp => <TsPropertyData>{
                typeDefinition: this.lookupTypeDefinition(csProp.propType, filesData),
                propName: this.pascalToCamel(csProp.propName),
                isArray: csProp.isArray,
                isDictionary: csProp.isDictionary
            });

            return {
                modelName: this.parseClassName(csModel.modelName),
                properties: tsProps
            };
        }

        return null;
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
    
                const isPropCollection = this.isCsCollectionType(filteredData);
    
                arr.push({
                    propType: isPropCollection.collType || filteredData[0],
                    propName: isPropCollection.name || filteredData[1],
                    isArray: isPropCollection.isArray,
                    isDictionary: isPropCollection.isDictionary
                });
            }
    
            this.propArray(content.slice(pEnd + 1, content.length), arr);
        }
    
        return arr;
    };
    
    private isCsCollectionType = (propData: string[]): any => {
    
        const propString = propData.slice(0, propData.indexOf('{')).join('');
        
        if(propString.indexOf('[]') > -1) {
            return {
                isDictionary: false,
                isArray: true,
                collType: propString.substring(0, propString.indexOf('[')),
                name: propString.substr(propString.indexOf(']') + 1)
            };
        }

        if(propString.indexOf('Dictionary<') > -1) {
            return {
                isDictionary: true,
                isArray: false,
                collType: propString.substring(propString.indexOf(',') + 1, propString.indexOf('>')),
                name: propString.substr(propString.indexOf('>') + 1)
            };
        }
        const isCollection = propString.match(/\<(?:<[^<>]+?>|[^<>\,])+?>/);

        if(isCollection && isCollection.length > 0 && this.csArrayTypes.some(x => x === propString.substring(0, propString.indexOf('<')))) {
            return {
                isDictionary: false,
                isArray: true,
                collType: isCollection[0].substring(1, isCollection[0].length - 1),
                name: propString.substr(propString.indexOf('>') + 1)
            };
        }
    
        return {
            isDictionary: false,
            isArray: false,
            collType: null,
            name: null
        };
    }

    private checkNullable = (type: string): PrimitiveProp => type != null && type.indexOf('?') !== -1 ? {
            propType: type.replace('?', ''),
            isNullable : true
        } : {
            propType: type,
            isNullable: false
        };
    
    private mapPrimitiveType = (csType: string): PrimitiveProp => {
        
        const csPriminiveProp = this.checkNullable(csType);

        const tsPrimitiveProp =  this.csCommonTypeMap[csPriminiveProp.propType.toLowerCase()];

        return tsPrimitiveProp ? {
            propType: tsPrimitiveProp,
            isNullable: csPriminiveProp.isNullable
        } : {
            propType: 'any',
            isNullable: false
        };
    };
    
    private pascalToCamel = (str: string) => str ? str.replace(/^(?:[A-Z])+(?=[A-Z])|^[A-Z]/, x => x.toLowerCase()) : null;

    private lookupTypeDefinition = (propType: string, filesData: FileData[]): TsPropertyType => {
        
        const propModelData = filesData.find(fileData => fileData.fileName === propType);

        if(propModelData) {
            return {
                propImportPath: propModelData.filePath,
                propType: propType,
                isNullable: false
            }
        }

        const primitiveProp = this.mapPrimitiveType(propType);

        return {
            propImportPath: null,
            propType: primitiveProp.propType,
            isNullable: primitiveProp.isNullable
        };
    };

    private parseClassName = (declaration: string): string => {

        const hasSpecialChars = declaration.match(/[^a-zA-Z0-9]/g);

        return hasSpecialChars ? declaration.substring(0, declaration.indexOf(hasSpecialChars[0])) : declaration;
    };

    private findScopeElements = (fileString: string): Nesting[] => {
        let level = 0; 
        let nestings: Nesting[] = [];
    
        fileString.split('').forEach((x, i) => {
            if(x === '{') {
                nestings.push({ nestingSymbol: '{', positionInCode: i, nestingLevel: level });
                level++;
            }
    
            if(x === '}') {
                level--;
                nestings.push({ nestingSymbol: '}', positionInCode: i, nestingLevel: level });
            }
        });
    
        return nestings;
    };

    private matchPublicModel = (fileString: string, startPos: number, endPos: number): RegExpMatchArray | null => fileString.substring(startPos, endPos)
        .match(/(public)(.+)(class|struct|enum)(\s)+/g);

    private scopeElementsToModelData = (element: Nesting, idx: number, arr: Nesting[], namespaceData: string): CsModelData | null => {
        if(element.nestingSymbol === '{') {
            const startLookup = idx === 0 ? 0 : arr[idx - 1].positionInCode + 1;

            const publicEntity = this.matchPublicModel(namespaceData, startLookup, element.positionInCode);

            if(publicEntity != null) {
                const entityName = namespaceData.substring(startLookup, element.positionInCode).replace(publicEntity[0], '').trim();
                const entityContent = namespaceData.substring(element.positionInCode + 1, arr[idx + 1].positionInCode).trim().split(/[\s]+/);

                return {
                    modelName: entityName,
                    modelContent: this.propArray(entityContent, [])
                };
            }

            return null;
        }

        return null;
    };
}