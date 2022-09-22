"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonRpcDisabledError = exports.CrashError = exports.AlreadyDestroyedError = void 0;
class AlreadyDestroyedError extends Error {
    constructor() {
        super();
        this.name = "AlreadyDestroyedError";
    }
}
exports.AlreadyDestroyedError = AlreadyDestroyedError;
class CrashError extends Error {
    constructor(message) {
        super(message);
        this.name = "CrashError";
    }
}
exports.CrashError = CrashError;
class JsonRpcDisabledError extends Error {
    constructor() {
        super();
        this.name = "JsonRpcDisabledError";
    }
}
exports.JsonRpcDisabledError = JsonRpcDisabledError;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29ubmVjdG9yL3R5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQW1JQSxNQUFhLHFCQUFzQixTQUFRLEtBQUs7SUFDOUM7UUFDRSxLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxJQUFJLEdBQUcsdUJBQXVCLENBQUE7SUFDckMsQ0FBQztDQUNGO0FBTEQsc0RBS0M7QUFFRCxNQUFhLFVBQVcsU0FBUSxLQUFLO0lBQ25DLFlBQVksT0FBZTtRQUN6QixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDZCxJQUFJLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQTtJQUMxQixDQUFDO0NBQ0Y7QUFMRCxnQ0FLQztBQUVELE1BQWEsb0JBQXFCLFNBQVEsS0FBSztJQUM3QztRQUNFLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLElBQUksR0FBRyxzQkFBc0IsQ0FBQTtJQUNwQyxDQUFDO0NBQ0Y7QUFMRCxvREFLQyJ9