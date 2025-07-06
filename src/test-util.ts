export function afterTick() {
    return new Promise((resolve => setImmediate(resolve)));
}