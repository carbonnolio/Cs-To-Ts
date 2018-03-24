import * as mkdirp from 'mkdirp';
import * as fs from 'fs';
import { promisify } from 'util';

import { TsModelData, TsPropertyData, TsFileData } from './interfaces';

export default class FileGenerator {

    private mkdirpAsync = promisify(mkdirp);
    private writeFileAsync = promisify(fs.writeFile);

    constructor() {}

    populateTsFiles = (tsModels: (TsModelData | null)[], outputDir: string): Promise<void[]> => new Promise<void[]>((resolve, reject) => {
        const fileStrings = tsModels.map(tsModel => tsModel ? this.createTsContent(tsModel) : null);

        this.mkdirpAsync(outputDir).then(() => {
            const fileGeneratorPromises = fileStrings.map(tsFileData => {
                if(tsFileData) {
                    this.writeFileAsync(`${outputDir}/${tsFileData.fileName}.ts`, tsFileData.fileContent, 'utf8')
                        .then(() => console.log(`File ${tsFileData.fileName}.ts created successfully.`));
                }
            });

            resolve(Promise.all(fileGeneratorPromises));
        })
        .catch(err => reject(err));
    });

    private createTsContent = (tsModel: TsModelData): TsFileData => {

        const fileImports = tsModel.properties.filter(tsProp => 
            tsProp.typeDefinition.propImportPath !== null)
        .reduce((prev, curr) => 
            `${prev}import { ${curr.typeDefinition.propType} } from './${curr.typeDefinition.propType}';\n`,''
        );

        const tsProps = tsModel.properties.reduce((prev, curr) => 
            `${prev}\t${curr.propName}: ${curr.typeDefinition.propType}${curr.isArray ? '[]' : ''};\n`, ''
        );
        
        const header = `export interface ${tsModel.modelName} {\n`;
        const footer = '}';

        return {
            fileName: tsModel.modelName,
            fileContent: `${fileImports !== '' ? fileImports + '\n' : ''}${header}${tsProps}${footer}`
        };
    };

    private pascalToCamel = (str: string) => str ? str.replace(/^(?:[A-Z])+(?=[A-Z])|^[A-Z]/, x => x.toLowerCase()) : null;
}