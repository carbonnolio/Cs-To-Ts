import * as program from 'commander';
import chalk from 'chalk';

import { ExecuteWithParamsFunc } from './interfaces';

export default class CommandHandler {
    
    constructor() {}

    public handleCommands = (execute: ExecuteWithParamsFunc): void => {
        program
            .arguments('<input> <output>')
            .action((input, output) => {
                
                if(this.validateParam(input, 'Input') && this.validateParam(output, 'Output')) {
                    execute(input, output);
                }
            })
            .parse(process.argv);
    };

    private validateParam = (param: string, paramName: string): boolean => {
        if(param == null || param.length === 0) {
            console.error(chalk.red(`${paramName} directory is not provided!`));

            return false;
        }

        return true;
    };
}