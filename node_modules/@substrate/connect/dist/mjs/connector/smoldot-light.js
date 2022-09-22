import { getSpec } from "./specs/index.js";
import { AlreadyDestroyedError, CrashError, JsonRpcDisabledError, } from "./types.js";
let startPromise = null;
const getStart = () => {
    if (startPromise)
        return startPromise;
    startPromise = import("@substrate/smoldot-light").then((sm) => sm.start);
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
            throw new JsonRpcDisabledError();
        if ((error === null || error === void 0 ? void 0 : error.name) === "CrashError")
            throw new CrashError(error.message);
        if ((error === null || error === void 0 ? void 0 : error.name) === "AlreadyDestroyedError")
            throw new AlreadyDestroyedError();
        throw new CrashError(e instanceof Error ? e.message : `Unexpected error ${e}`);
    }
};
/**
 * Returns a {ScClient} that connects to chains by executing a light client directly
 * from JavaScript.
 *
 * This is quite expensive in terms of CPU, but it is the only choice when the substrate-connect
 * extension is not installed.
 */
export const createScClient = (config) => {
    const configOrDefault = config || { maxLogLevel: 3 };
    const chains = new Map();
    const addChain = async (chainSpec, jsonRpcCallback) => {
        const client = await getClientAndIncRef(configOrDefault);
        try {
            const internalChain = await client.addChain({
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
    };
    const addWellKnownChain = async (supposedChain, jsonRpcCallback) => {
        // the following line ensures that the http request for the dynamic import
        // of smoldot-light and the request for the dynamic import of the spec
        // happen in parallel
        getClientAndIncRef(configOrDefault);
        try {
            const spec = await getSpec(supposedChain);
            return await addChain(spec, jsonRpcCallback);
        }
        finally {
            decRef(configOrDefault);
        }
    };
    return { addChain, addWellKnownChain };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic21vbGRvdC1saWdodC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb25uZWN0b3Ivc21vbGRvdC1saWdodC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFLQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDMUMsT0FBTyxFQUtMLHFCQUFxQixFQUNyQixVQUFVLEVBQ1Ysb0JBQW9CLEdBQ3JCLE1BQU0sWUFBWSxDQUFBO0FBR25CLElBQUksWUFBWSxHQUF1RCxJQUFJLENBQUE7QUFDM0UsTUFBTSxRQUFRLEdBQUcsR0FBRyxFQUFFO0lBQ3BCLElBQUksWUFBWTtRQUFFLE9BQU8sWUFBWSxDQUFBO0lBQ3JDLFlBQVksR0FBRyxNQUFNLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN4RSxPQUFPLFlBQVksQ0FBQTtBQUNyQixDQUFDLENBQUE7QUFFRCxNQUFNLGdCQUFnQixHQUFhLEVBQUUsQ0FBQSxDQUFDLG9GQUFvRjtBQUMxSCxJQUFJLGFBQWEsR0FBb0MsSUFBSSxDQUFBO0FBQ3pELElBQUksMkJBQTJCLEdBQUcsQ0FBQyxDQUFBO0FBQ25DLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxNQUFjLEVBQW1CLEVBQUU7SUFDN0QsSUFBSSxNQUFNLENBQUMsV0FBVyxJQUFJLE1BQU0sQ0FBQyxXQUFXLEdBQUcsMkJBQTJCO1FBQ3hFLDJCQUEyQixHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUE7SUFFbEQsSUFBSSxhQUFhLEVBQUU7UUFDakIsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzdCLElBQUksYUFBYSxZQUFZLE9BQU87WUFBRSxPQUFPLGFBQWEsQ0FBQTs7WUFDckQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0tBQzNDO0lBRUQsTUFB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