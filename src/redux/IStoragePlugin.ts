
export interface IStoragePlugin {
    clear():void;
    key(index:number):string;
    getItem(key:string):string;
    setItem(key:string, value: string):void;
    removeItem(key:string):void;
}

export interface IStoragePluginFactory extends IStoragePlugin {
    (): void;
}
