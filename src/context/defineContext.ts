import { StaticCommon } from "elmer-common";

export type TypeDefineContextOptions = {
    saveAttrKey?: string;
    contextData?: any;
};

export const defineContext = (target:any, options:TypeDefineContextOptions) => {
    const cOptions:TypeDefineContextOptions = {
        saveAttrKey: "contextStore"
    };
    StaticCommon.extend(cOptions, options);
    if(!StaticCommon.isEmpty(cOptions.contextData) && !StaticCommon.isEmpty(cOptions.saveAttrKey)) {
        // define context store to target
        const oldData = target[cOptions.saveAttrKey] || {};
        const defineData = cOptions.contextData;
        for(const key in defineData) {
            if(!oldData[key]) {
                StaticCommon.defineReadOnlyProperty(oldData, key, defineData[key]);
            } else {
                // tslint:disable-next-line: no-console
                console.error(`Define context error, the property ${key} was existing on target object.`);
                break;
            }
        }
        if(!target[cOptions.saveAttrKey]) {
            StaticCommon.defineReadOnlyProperty(target, cOptions.saveAttrKey, oldData);
        }
        return oldData;
    } else {
        // tslint:disable-next-line: no-console
        console.error("saveAttrkey and contextData can not be undefined or null");
    }
};
