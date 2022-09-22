import { AlreadyDestroyedError, CrashError, JsonRpcDisabledError, } from "./types.js";
import { getSpec } from "./specs/index.js";
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
export const createScClient = () => {
    const chains = new Map();
    const internalAddChain = async (isWellKnown, chainSpecOrWellKnownName, jsonRpcCallback, potentialRelayChainIds = []) => {
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
                                error: new CrashError("Error while creating the chain: " + msg.errorMessage),
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
                                error: new CrashError("Extension has killed the chain: " + msg.errorMessage),
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
        await initFinished;
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
                chainSpec: await getSpec(chainSpecOrWellKnownName),
                potentialRelayChainIds: [],
            });
            await initFinished;
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
                    throw new JsonRpcDisabledError();
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
                    error: new AlreadyDestroyedError(),
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
    };
    return {
        addChain: (chainSpec, jsonRpcCallback) => internalAddChain(false, chainSpec, jsonRpcCallback, [...chains.values()]),
        addWellKnownChain: (name, jsonRpcCallback) => internalAddChain(true, name, jsonRpcCallback),
    };
};
// Sends a message to the extension. This function primarly exists in order to provide strong
// typing for the message.
function postToExtension(msg) {
    window.postMessage(msg, "*");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2Nvbm5lY3Rvci9leHRlbnNpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUNMLHFCQUFxQixFQUNyQixVQUFVLEVBQ1Ysb0JBQW9CLEdBSXJCLE1BQU0sWUFBWSxDQUFBO0FBRW5CLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUUxQyxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBd0MsQ0FBQTtBQUNqRSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRTtJQUM5QixNQUFNLENBQUMsZ0JBQWdCLENBQ3JCLFNBQVMsRUFDVCxDQUFDLEVBQUUsSUFBSSxFQUErQixFQUFFLEVBQUU7O1FBQ3hDLElBQUksQ0FBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsTUFBTSxNQUFLLDZCQUE2QjtZQUFFLE9BQU07UUFDMUQsTUFBQSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsMENBQUcsSUFBSSxDQUFDLENBQUE7SUFDckMsQ0FBQyxDQUNGLENBQUE7Q0FDRjtBQUVELFNBQVMsZ0JBQWdCO0lBQ3ZCLE1BQU0sR0FBRyxHQUFHLElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2pDLHlEQUF5RDtJQUN6RCxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzNCLE1BQU0sTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM5QyxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7QUFDNUIsQ0FBQztBQUVEOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLEdBQWEsRUFBRTtJQUMz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