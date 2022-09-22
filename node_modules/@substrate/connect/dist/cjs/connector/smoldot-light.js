"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScClient = void 0;
const index_js_1 = require("./specs/index.js");
const types_js_1 = require("./types.js");
let startPromise = null;
const getStart = () => {
    if (startPromise)
        return startPromise;
    startPromise = Promise.resolve().then(() => __importStar(require("@substrate/smoldot-light"))).then((sm) => sm.start);
    return startPromise;
};
const clientReferences = []; // Note that this can't be a set, as the same config is added/removed multiple times
let clientPromise = null;
let clientReferencesMaxLogLevel = 3;
const getClientAndIncRef = (config) => {
    if (config.maxLogLevel && config.maxLogLevel > clientReferencesMaxLogLevel)
        clientReferencesMaxLogLevel = config.maxLogLevel;
    if (clientPromise) {
        clientReferences.push(config);
        if (clientPromise instanceof Promise)
            return clientPromise;
        else
            return Promise.resolve(clientPromise);
    }
    const newClientPromise = getStart().then((start) => start({
        forbidTcp: true,
        forbidNonLocalWs: true,
        maxLogLevel: 9999999,
        cpuRateLimit: 0.5,
        logCallback: (level, target, message) => {
            if (level > clientReferencesMaxLogLevel)
                return;
            // The first parameter of the methods of `console` has some printf-like substitution
            // capabilities. We don't really need to use this, but not using it means that the logs
            // might not get printed correctly if they contain `%`.
            if (level <= 1) {
                console.error("[%s] %s", target, message);
            }
            else if (level === 2) {
                console.warn("[%s] %s", target, message);
            }
            else if (level === 3) {
                console.info("[%s] %s", target, message);
            }
            else if (level === 4) {
                console.debug("[%s] %s", target, message);
            }
            else {
                console.trace("[%s] %s", target, message);
            }
        },
    }));
    clientPromise = newClientPromise;
    newClientPromise.then((client) => {
        // Make sure that the client we have just created is still desired
        if (clientPromise === newClientPromise)
            clientPromise = client;
        else
            client.terminate();
        // Note that if clientPromise != newClientPromise we know for sure that the client that we
        // return isn't going to be used. We would rather not return a terminated client, but this
        // isn't possible for type check reasons.
        return client;
    });
    clientReferences.push(config);
    return clientPromise;
};
// Must be passed the exact same object as was passed to {getClientAndIncRef}
const decRef = (config) => {
    const idx = clientReferences.indexOf(config);
    if (idx === -1)
        throw new Error("Internal error within smoldot-light");
    clientReferences.splice(idx, 1);
    // Update `clientReferencesMaxLogLevel`
    // Note how it is set back to 3 if there is no reference anymore
    clientReferencesMaxLogLevel = 3;
    for (const cfg of clientReferences.values()) {
        if (cfg.maxLogLevel && cfg.maxLogLevel > clientReferencesMaxLogLevel)
            clientReferencesMaxLogLevel = cfg.maxLogLevel;
    }
    if (clientReferences.length === 0) {
        if (clientPromise && !(clientPromise instanceof Promise))
            clientPromise.terminate();
        clientPromise = null;
    }
};
const transformErrors = (thunk) => {
    try {
        thunk();
    }
    catch (e) {
        const error = e;
        if ((error === null || error === void 0 ? void 0 : error.name) === "JsonRpcDisabledError")
            throw new types_js_1.JsonRpcDisabledError();
        if ((error === null || error === void 0 ? void 0 : error.name) === "CrashError")
            throw new types_js_1.CrashError(error.message);
        if ((error === null || error === void 0 ? void 0 : error.name) === "AlreadyDestroyedError")
            throw new types_js_1.AlreadyDestroyedError();
        throw new types_js_1.CrashError(e instanceof Error ? e.message : `Unexpected error ${e}`);
    }
};
/**
 * Returns a {ScClient} that connects to chains by executing a light client directly
 * from JavaScript.
 *
 * This is quite expensive in terms of CPU, but it is the only choice when the substrate-connect
 * extension is not installed.
 */
const createScClient = (config) => {
    const configOrDefault = config || { maxLogLevel: 3 };
    const chains = new Map();
    const addChain = (chainSpec, jsonRpcCallback) => __awaiter(void 0, void 0, void 0, function* () {
        const client = yield getClientAndIncRef(configOrDefault);
        try {
            const internalChain = yield client.addChain({
                chainSpec,
                potentialRelayChains: [...chains.values()],
                jsonRpcCallback,
            });
            const chain = {
                sendJsonRpc: (rpc) => {
                    transformErrors(() => {
                        internalChain.sendJsonRpc(rpc);
                    });
                },
                remove: () => {
                    try {
                        transformErrors(() => {
                            internalChain.remove();
                        });
                    }
                    finally {
                        chains.delete(chain);
                        decRef(configOrDefault);
                    }
                },
            };
            chains.set(chain, internalChain);
            return chain;
        }
        catch (error) {
            decRef(configOrDefault);
            throw error;
        }
    });
    const addWellKnownChain = (supposedChain, jsonRpcCallback) => __awaiter(void 0, void 0, void 0, function* () {
        // the following line ensures that the http request for the dynamic import
        // of smoldot-light and the request for the dynamic import of the spec
        // happen in parallel
        getClientAndIncRef(configOrDefault);
        try {
            const spec = yield (0, index_js_1.getSpec)(supposedChain);
            return yield addChain(spec, jsonRpcCallback);
        }
        finally {
            decRef(configOrDefault);
        }
    });
    return { addChain, addWellKnownChain };
};
exports.createScClient = createScClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic21vbGRvdC1saWdodC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb25uZWN0b3Ivc21vbGRvdC1saWdodC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUtBLCtDQUEwQztBQUMxQyx5Q0FRbUI7QUFHbkIsSUFBSSxZQUFZLEdBQXVELElBQUksQ0FBQTtBQUMzRSxNQUFNLFFBQVEsR0FBRyxHQUFHLEVBQUU7SUFDcEIsSUFBSSxZQUFZO1FBQUUsT0FBTyxZQUFZLENBQUE7SUFDckMsWUFBWSxHQUFHLGtEQUFPLDBCQUEwQixJQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3hFLE9BQU8sWUFBWSxDQUFBO0FBQ3JCLENBQUMsQ0FBQTtBQUVELE1BQU0sZ0JBQWdCLEdBQWEsRUFBRSxDQUFBLENBQUMsb0ZBQW9GO0FBQzFILElBQUksYUFBYSxHQUFvQyxJQUFJLENBQUE7QUFDekQsSUFBSSwyQkFBMkIsR0FBRyxDQUFDLENBQUE7QUFDbkMsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLE1BQWMsRUFBbUIsRUFBRTtJQUM3RCxJQUFJLE1BQU0sQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDLFdBQVcsR0FBRywyQkFBMkI7UUFDeEUsMkJBQTJCLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQTtJQUVsRCxJQUFJLGFBQWEsRUFBRTtRQUNqQixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDN0IsSUFBSSxhQUFhLFlBQVksT0FBTztZQUFFLE9BQU8sYUFBYSxDQUFBOztZQUNyRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7S0FDM0M7SUFFRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFF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