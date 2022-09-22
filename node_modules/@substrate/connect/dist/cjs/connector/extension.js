"use strict";
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
const types_js_1 = require("./types.js");
const index_js_1 = require("./specs/index.js");
const listeners = new Map();
if (typeof window === "object") {
    window.addEventListener("message", ({ data }) => {
        var _a;
        if ((data === null || data === void 0 ? void 0 : data.origin) !== "substrate-connect-extension")
            return;
        (_a = listeners.get(data.chainId)) === null || _a === void 0 ? void 0 : _a(data);
    });
}
function getRandomChainId() {
    const arr = new BigUint64Array(2);
    // It can only be used from the browser, so this is fine.
    crypto.getRandomValues(arr);
    const result = (arr[1] << BigInt(64)) | arr[0];
    return result.toString(36);
}
/**
 * Returns a {@link ScClient} that connects to chains by asking the substrate-connect extension
 * to do so.
 *
 * This function assumes that the extension is installed and available. It is out of scope of this
 * function to detect whether this is the case.
 * If you try to add a chain without the extension installed, nothing will happen and the
 * `Promise`s will never resolve.
 */
const createScClient = () => {
    const chains = new Map();
    const internalAddChain = (isWellKnown, chainSpecOrWellKnownName, jsonRpcCallback, potentialRelayChainIds = []) => __awaiter(void 0, void 0, void 0, function* () {
        let resolve;
        const initFinished = new Promise((res) => {
            resolve = () => res(null);
        });
        const chainState = {
            id: getRandomChainId(),
            state: {
                state: "pending",
                waitFinished: resolve,
            },
        };
        if (listeners.has(chainState.id))
            throw new Error("Unexpectedly randomly generated the same chain ID twice despite 64bits of entropy");
        // Setup the listener for this chain.
        // This listener should never be removed until we are no longer interested in this chain.
        // Removing then re-adding the listener could cause messages to be missed.
        listeners.set(chainState.id, (msg) => {
            switch (chainState.state.state) {
                case "pending": {
                    const waitFinished = chainState.state.waitFinished;
                    switch (msg.type) {
                        case "chain-ready": {
                            chainState.state = {
                                state: "ok",
                            };
                            break;
                        }
                        case "error": {
                            chainState.state = {
                                state: "dead",
                                error: new types_js_1.CrashError("Error while creating the chain: " + msg.errorMessage),
                            };
                            break;
                        }
                        default: {
                            // Unexpected message. We ignore it.
                            // While it could be tempting to switch the chain to `dead`, the extension might
                            // think that the chain is still alive, and the state mismatch could have
                            // unpredictable and confusing consequences.
                            console.warn("Unexpected message of type `msg.type` received from substrate-connect extension");
                        }
                    }
                    waitFinished();
                    break;
                }
                case "ok": {
                    switch (msg.type) {
                        case "error": {
                            chainState.state = {
                                state: "dead",
                                error: new types_js_1.CrashError("Extension has killed the chain: " + msg.errorMessage),
                            };
                            break;
                        }
                        case "rpc": {
                            if (jsonRpcCallback) {
                                jsonRpcCallback(msg.jsonRpcMessage);
                            }
                            else {
                                console.warn("Unexpected message of type `msg.type` received from substrate-connect extension");
                            }
                            break;
                        }
                        default: {
                            // Unexpected message. We ignore it.
                            // While it could be tempting to switch the chain to `dead`, the extension might
                            // think that the chain is still alive, and the state mismatch could have
                            // unpredictable and confusing consequences.
                            console.warn("Unexpected message of type `msg.type` received from substrate-connect extension");
                        }
                    }
                    break;
                }
                case "dead": {
                    // We don't expect any message anymore.
                    break;
                }
            }
        });
        // Now that everything is ready to receive messages back from the extension, send the
        // add-chain message.
        if (isWellKnown) {
            postToExtension({
                origin: "substrate-connect-client",
                chainId: chainState.id,
                type: "add-well-known-chain",
                chainName: chainSpecOrWellKnownName,
            });
        }
        else {
            postToExtension({
                origin: "substrate-connect-client",
                chainId: chainState.id,
                type: "add-chain",
                chainSpec: chainSpecOrWellKnownName,
                potentialRelayChainIds,
            });
        }
        // Wait for the extension to send back either a confirmation or an error.
        // Note that `initFinished` becomes ready when `chainState` has been modified. The outcome
        // can be known by looking into `chainState`.
        yield initFinished;
        // In the situation where we tried to create a well-known chain, the extension isn't supposed
        // to ever return an error. There is however one situation where errors can happen: if the
        // extension doesn't recognize the desired well-known chain because it uses a different list
        // of well-known chains than this code. To handle this, we download the chain spec of the
        // desired well-known chain and try again but this time as a non-well-known chain.
        if (isWellKnown && chainState.state.state === "dead") {
            // Note that we keep the same id for the chain for convenience.
            let resolve;
            const initFinished = new Promise((res) => {
                resolve = () => res(null);
            });
            chainState.state = {
                state: "pending",
                waitFinished: resolve,
            };
            postToExtension({
                origin: "substrate-connect-client",
                chainId: chainState.id,
                type: "add-chain",
                chainSpec: yield (0, index_js_1.getSpec)(chainSpecOrWellKnownName),
                potentialRelayChainIds: [],
            });
            yield initFinished;
        }
        // Now check the `chainState` to know if things have succeeded.
        if (chainState.state.state === "dead") {
            throw chainState.state.error;
        }
        // Everything is successful.
        const chain = {
            sendJsonRpc: (jsonRpcMessage) => {
                if (chainState.state.state === "dead") {
                    throw chainState.state.error;
                }
                if (!jsonRpcCallback)
                    throw new types_js_1.JsonRpcDisabledError();
                postToExtension({
                    origin: "substrate-connect-client",
                    chainId: chainState.id,
                    type: "rpc",
                    jsonRpcMessage,
                });
            },
            remove: () => {
                if (chainState.state.state === "dead") {
                    throw chainState.state.error;
                }
                chainState.state = {
                    state: "dead",
                    error: new types_js_1.AlreadyDestroyedError(),
                };
                listeners.delete(chainState.id);
                chains.delete(chain);
                postToExtension({
                    origin: "substrate-connect-client",
                    chainId: chainState.id,
                    type: "remove-chain",
                });
            },
        };
        // This mapping of chains is kept just for the `potentialRelayChainIds` field.
        chains.set(chain, chainState.id);
        return chain;
    });
    return {
        addChain: (chainSpec, jsonRpcCallback) => internalAddChain(false, chainSpec, jsonRpcCallback, [...chains.values()]),
        addWellKnownChain: (name, jsonRpcCallback) => internalAddChain(true, name, jsonRpcCallback),
    };
};
exports.createScClient = createScClient;
// Sends a message to the extension. This function primarly exists in order to provide strong
// typing for the message.
function postToExtension(msg) {
    window.postMessage(msg, "*");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2Nvbm5lY3Rvci9leHRlbnNpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBSUEseUNBT21CO0FBRW5CLCtDQUEwQztBQUUxQyxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBd0MsQ0FBQTtBQUNqRSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRTtJQUM5QixNQUFNLENBQUMsZ0JBQWdCLENBQ3JCLFNBQVMsRUFDVCxDQUFDLEVBQUUsSUFBSSxFQUErQixFQUFFLEVBQUU7O1FBQ3hDLElBQUksQ0FBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsTUFBTSxNQUFLLDZCQUE2QjtZQUFFLE9BQU07UUFDMUQsTUFBQSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsMENBQUcsSUFBSSxDQUFDLENBQUE7SUFDckMsQ0FBQyxDQUNGLENBQUE7Q0FDRjtBQUVELFNBQVMsZ0JBQWdCO0lBQ3ZCLE1BQU0sR0FBRyxHQUFHLElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2pDLHlEQUF5RDtJQUN6RCxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzNCLE1BQU0sTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM5QyxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7QUFDNUIsQ0FBQztBQUVEOzs7Ozs7OztHQVFHO0FBQ0ksTUFBTSxjQUFjLEdBQUcsR0FBYSxFQUFFO0lBQzNDLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUFpQixDQUFBO0lBRXZDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FDdkIsV0FBb0IsRUFDcEIsd0JB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