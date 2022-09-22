export async function getSpec(chain) {
    // We don't want API users to be able to `import` a file outside of the `generated` directory.
    // While it is probably harmless, better be safe than sorry.
    // This is done by make sure that the name doesn't contain `..`. This also means that we can't
    // support well-known chain whose name contains `..`, but that seems unlikely to ever be
    // problematic.
    if (chain.indexOf("..") !== -1)
        throw new Error("Invalid chain name");
    try {
        const specRaw = (await import("./generated/" + chain + ".js"));
        return typeof specRaw === "string"
            ? specRaw
            : specRaw.default;
    }
    catch (error) {
        throw new Error("Invalid chain name");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY29ubmVjdG9yL3NwZWNzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sQ0FBQyxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQWE7SUFDekMsOEZBQThGO0lBQzlGLDREQUE0RDtJQUM1RCw4RkFBOEY7SUFDOUYsd0ZBQXdGO0lBQ3hGLGVBQWU7SUFDZixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBRXJFLElBQUk7UUFDRixNQUFNLE9BQU8sR0FBRyxDQUFDLE1BQU0sTUFBTSxDQUFDLGNBQWMsR0FBRyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBRXRDLENBQUE7UUFFdkIsT0FBTyxPQUFPLE9BQU8sS0FBSyxRQUFRO1lBQ2hDLENBQUMsQ0FBQyxPQUFPO1lBQ1QsQ0FBQyxDQUFFLE9BQTBDLENBQUMsT0FBTyxDQUFBO0tBQ3hEO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUE7S0FDdEM7QUFDSCxDQUFDIn0=