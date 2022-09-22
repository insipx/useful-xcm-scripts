export class AlreadyDestroyedError extends Error {
    constructor() {
        super();
        this.name = "AlreadyDestroyedError";
    }
}
export class CrashError extends Error {
    constructor(message) {
        super(message);
        this.name = "CrashError";
    }
}
export class JsonRpcDisabledError extends Error {
    constructor() {
        super();
        this.name = "JsonRpcDisabledError";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29ubmVjdG9yL3R5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQW1JQSxNQUFNLE9BQU8scUJBQXNCLFNBQVEsS0FBSztJQUM5QztRQUNFLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLElBQUksR0FBRyx1QkFBdUIsQ0FBQTtJQUNyQyxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sVUFBVyxTQUFRLEtBQUs7SUFDbkMsWUFBWSxPQUFlO1FBQ3pCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNkLElBQUksQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFBO0lBQzFCLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxLQUFLO0lBQzdDO1FBQ0UsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsSUFBSSxHQUFHLHNCQUFzQixDQUFBO0lBQ3BDLENBQUM7Q0FDRiJ9