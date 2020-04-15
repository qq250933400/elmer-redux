import { Common } from "elmer-common";
import { IConnectParams } from "./connect";
import { defineReduxProvider } from "./defineReduxProvider";
import { IStoragePlugin } from "./IStoragePlugin";
import { REDUX_GLOBAL_LISTEN_KEY, REDUX_GLOBAL_STATE_KEY } from "./ReduxGlobalStateKeys";

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
    async dispatch(pushState:any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            try {
                this.doDispatch(pushState);
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
    private doDispatch(pushState:any): void {
        if(!this.isEmpty(pushState) && !this.isEmpty(pushState.type)) {
            // 这里做dispatch操作
            let reducerKeys = Object.keys(this.reducersData);
            const stateData = this.getStates();
            for(const tmpReducerKey of reducerKeys) {
                const oldData = this.getValue(stateData, tmpReducerKey);
                const oldStateData = oldData !== undefined && null !== oldData ? JSON.parse(JSON.stringify(oldData)) : oldData;
                const checkReducer = this.reducersData[tmpReducerKey];
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
            reducerKeys = null;
        } else {
            if(pushState && this.isEmpty(pushState.type)) {
                throw new Error("[ReduxController.dispatch] pushState未指定type属性");
            } else {
                throw new Error("[ReduxController.dispatch] pushState不是object对象");
            }
        }
    }
    private defineStateValue(stateValue: any): void {
        if(this.isObject(stateValue)) {
            Object.keys(stateValue).map((stateKey: any) => {
                ((propsKey: any, propsValue: any) => {
                    // if(this.isObject(propsValue)) {
                    //     this.defineStateValue(propsValue);
                    // }
                    // remove loop defineState, improve dispatch performence
                    Object.defineProperty(stateValue, propsKey, {
                        configurable: true,
                        enumerable: true,
                        get: () => {
                            return propsValue;
                        },
                        set: () => {
                            // tslint:disable-next-line:no-console
                            console.error("不允许直接修改Redux数据！");
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
                        typeof tmpComponent.$onPropsChanged === "function" && tmpComponent.$onPropsChanged(checkProps);
                    }
                    tmpComponent = null;
                    checkProps = null;
                }
                tmpComponents = null;
            }
        });
    }
}
