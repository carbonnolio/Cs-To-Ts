import { TsPropertyType } from './';

export interface TsPropertyData {
    typeDefinition: TsPropertyType;
    propName: string;
    isArray: boolean;
}