import { Common } from "elmer-common";
import { IConnectParams } from "./connect";
import { attachReducerToController } from "./createReducer";
import { defineReduxProvider } from "./defineReduxProvider";
import { IStoragePlugin } from "./IStoragePlugin";
import { REDUX_GLOBAL_LISTEN_KEY, REDUX_GLOBAL_STATE_KEY } from "./ReduxGlobalStateKeys";

type TypeDisptachOptions = {
    selector?: string[];
    reducers?: string[];
}

export class ReduxController extends Common {
    static className: string = "ReduxController";
    stateData: any = {};
    stateWatchs: any = {};
    reducers: any = {};
    reducersData: any = {};
    initComponents: any = [];
    saveStore: IStoragePlugin;
    autoSave: boolean = false;
    saveDataKey: string = "ElmerReduxState";
    getGlobalState: Function;
    defineGlobalState: Function;
    private notifyCallbackNames: string[];
    constructor() {
        super();
        if(!this.reducers) {
            this.reducers = {};
        }
    }
    setNotifyCallback(callbackNames: string[]): void {
        this.notifyCallbackNames = callbackNames;
    }
    checkInitStateData(getGlobalState:Function, defineGlobalState: Function): void {
        if(!getGlobalState(REDUX_GLOBAL_STATE_KEY)) {
            defineReduxProvider(getGlobalState, defineGlobalState);
        }
        this.getGlobalState = getGlobalState;
        this.defineGlobalState = defineGlobalState;
        this.stateData = !this.stateData ? getGlobalState(REDUX_GLOBAL_STATE_KEY) : {
            ...this.stateData,
            ...getGlobalState(REDUX_GLOBAL_STATE_KEY)
        };
        this.stateWatchs = !this.stateWatchs ? (getGlobalState(REDUX_GLOBAL_LISTEN_KEY) || {}) : {
            ...this.stateWatchs,
            ...(getGlobalState(REDUX_GLOBAL_LISTEN_KEY) || {})
        };
    }
    connect(selector: string, mapStateToProps:Function, mapDispatchToProps:Function): void {
        if(!this.isEmpty(selector)) {
            if(!this.stateWatchs[selector]) {
                this.defineReadOnlyProperty(this.stateWatchs, selector, {
                    mapDispatchToProps,
                    mapStateToProps
                });
            }
        }
    }
    /**
     * 根据做connect操作selector获取state
     * @param selector string 组件tagName
     */
    getStateByConnectSelector(selector: string): any {
        const stateData = this.getStates();
        const listenData = this.getWatches();
        if(Object.keys(listenData).indexOf(selector)>=0) {
            const listen:IConnectParams = listenData[selector];
            return typeof listen.mapStateToProps === "function" && listen.mapStateToProps.call(this, stateData, this);
        }
    }
    getDispatchByConnectSelector(selector: string): any {
        const watches = this.getWatches();
        if(Object.keys(watches).indexOf(selector)>=0) {
            const listen:IConnectParams = watches[selector];
            return typeof listen.mapDispatchToProps === "function" && listen.mapDispatchToProps.call(this, this.dispatch.bind(this), this);
        }
    }
    checkInitComponents(targetComponent: any, selector: string, nodeData:any) : void {
        let keysData = Object.keys(this.getWatches());
        for(const tmpKey of keysData) {
            if(tmpKey === selector) {
                if(this.isEmpty(this.initComponents[selector])) {
                    this.initComponents[selector] = {};
                }
                this.initComponents[selector][nodeData.virtualID] = targetComponent;
                break;
            }
        }
        keysData = null;
    }
    removeComponent(selector: string, nodeData:any) : void {
        if(this.initComponents[selector]) {
            this.initComponents[selector][nodeData.virtualID] = null;
            delete this.initComponents[selector][nodeData.virtualID];
            if(Object.keys(this.initComponents[selector]).length<=0) {
                delete this.initComponents[selector];
            }
        }
    }
    async dispatch(pushState:any, options?: TypeDisptachOptions): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            try {
                this.doDispatch(pushState, options);
                if(this.autoSave) {
                    this.saveStore.setItem(this.saveDataKey, JSON.stringify(this.stateData));
                }
                resolve({
                    message: "success",
                    status: 200,
                });
            } catch(e) {
                reject({
                    message: e.message,
                    stack: e.stack,
                    status: 500
                });
            }
        });
    }
    private getStates(): any {
        const stateData = !this.stateData ? this.getGlobalState(REDUX_GLOBAL_STATE_KEY) : {
            ...this.stateData,
            ...this.getGlobalState(REDUX_GLOBAL_STATE_KEY)
        };
        return stateData;
    }
    private getWatches():any {
        const listeners = !this.stateWatchs ? (this.getGlobalState(REDUX_GLOBAL_LISTEN_KEY) || {}) : {
            ...this.stateWatchs,
            ...(this.getGlobalState(REDUX_GLOBAL_LISTEN_KEY) || {})
        };
        return listeners;
    }
    private doDispatch(pushState:any, options?: TypeDisptachOptions): void {
        try{
            if(!this.isEmpty(pushState) && !this.isEmpty(pushState.type)) {
                // 这里做dispatch操作
                let reducers = this.reducers;
                if(!reducers) {
                    this.reducers = {};
                    attachReducerToController(this);
                    reducers = this.reducers;
                }
                // 如何设置指定的selector或者reducer key, 只将state 推送到对应的reducer处理
                let allowKeys:string[] = options?.reducers || [];
                let reducerKeys = Object.keys(reducers);
                const stateData = this.getStates();
                for(const tmpReducerKey of reducerKeys) {
                    if(!allowKeys || allowKeys.length <= 0 || (allowKeys.length > 0 && allowKeys.indexOf(tmpReducerKey)>=0)) {
                        const oldData = this.getValue(stateData, tmpReducerKey);
                        const oldStateData = oldData !== undefined && null !== oldData ? JSON.parse(JSON.stringify(oldData)) : oldData;
                        const checkReducer = this.getValue(this.reducers, tmpReducerKey) as Function;
                        const newState = checkReducer(oldStateData, pushState, {
                            extend: this.extend
                        });
                        if(JSON.stringify(oldData) !== JSON.stringify(newState)) {
                            // reducer返回结果与state树上的数据不一致时，认为已经更新了
                            const updateState = {};
                            for(const stateKey of Object.keys(newState)) {
                                ((defineStateKey: string, defineStateValue: any) => {
                                    this.defineStateValue(defineStateValue);
                                    Object.defineProperty(updateState, defineStateKey, {
                                        configurable: true,
                                        enumerable: true,
                                        get: () => {
                                            return defineStateValue;
                                        },
                                        set: () => {
                                            // tslint:disable-next-line:no-console
                                            console.error("不允许直接修改Redux数据！", defineStateKey, defineStateValue);
                                        }
                                    });
                                })(stateKey, newState[stateKey]);
                            }
                            this.setValue(stateData, tmpReducerKey, updateState,(obj:any, propertyKey: string, value: any) => {
                                if(this.isObject(obj) && !this.isEmpty(propertyKey)) {
                                    if(!this.isEmpty(value)) {
                                        delete obj[propertyKey];
                                    }
                                    Object.defineProperty(obj, propertyKey, {
                                        configurable: true,
                                        enumerable: true,
                                        get: () => {
                                            return value || {};
                                        },
                                        set: () => {
                                            // tslint:disable-next-line:no-console
                                            console.error("不允许直接修改Redux数据！");
                                        }
                                    });
                                }
                            });
                            this.stateData = stateData;
                            this.checkChangeComponent();
                            break;
                        }
                    }
                }
                reducerKeys = null;
            } else {
                if(pushState && this.isEmpty(pushState.type)) {
                    throw new Error("[ReduxController.dispatch] pushState未指定type属性");
                } else {
                    throw new Error("[ReduxController.dispatch] pushState不是object对象");
                }
            }
        }catch(e) {
            console.error(e);
        }
    }
    private defineStateValue(stateValue: any): void {
        if(this.isObject(stateValue)) {
            Object.keys(stateValue).map((stateKey: any) => {
                ((propsKey: any, propsValue: any) => {
                    // remove loop defineState, improve dispatch performence
                    Object.defineProperty(stateValue, propsKey, {
                        configurable: true,
                        enumerable: true,
                        get: () => {
                            return propsValue;
                        },
                        set: () => {
                            // tslint:disable-next-line:no-console
                            console.error(`不允许直接修改Redux数据！[${stateKey}]`, stateValue);
                        }
                    });
                })(stateKey, stateValue[stateKey]);
            });
        }
    }
    private checkChangeComponent(): void {
        let watchesData = this.getWatches();
        let watchKeys = Object.keys(watchesData);
        for(const wKey of watchKeys) {
            let tmpWatch:IConnectParams = watchesData[wKey];
            if(typeof tmpWatch.mapStateToProps === "function") {
                let mapState = tmpWatch.mapStateToProps.call(this, this.getStates(), this);
                this.checkChangeForComponent(mapState, wKey);
                mapState = null;
            }
            tmpWatch = null;
        }
        watchKeys = null;
        watchesData = null;
    }
    private checkChangeForComponent(mapState: any, selector: string): void {
        Object.keys(this.initComponents).map((tmpSelector: string) => {
            if(tmpSelector === selector) {
                // 只对项目mapStateToPros，connect的组件做检查
                let tmpComponents = this.initComponents[tmpSelector];
                // tslint:disable-next-line:forin
                for(const virtualID in tmpComponents) {
                    let tmpComponent = tmpComponents[virtualID];
                    let checkProps = tmpComponent.props || {};
                    let hasChanged = false;

                    for(const mapKey in mapState) {
                        if(mapState && JSON.stringify(mapState[mapKey]) !== JSON.stringify(checkProps[mapKey])) {
                            hasChanged = true;
                            delete checkProps[mapKey];
                            this.defineReadOnlyProperty(checkProps, mapKey, mapState[mapKey]);
                        }
                    }
                    if(hasChanged) {
                        if(this.notifyCallbackNames && this.notifyCallbackNames.length > 0) {
                            // 设置多个callback为了兼容旧版本代码
                            this.notifyCallbackNames.map((callbackName: string) => {
                                typeof tmpComponent[callbackName] === "function" && tmpComponent[callbackName].call(tmpComponent, checkProps);
                            });
                        }
                    }
                    tmpComponent = null;
                    checkProps = null;
                }
                tmpComponents = null;
            }
        });
    }
}
