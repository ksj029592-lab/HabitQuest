// Share only an in-flight operation; no cross-user or completed-response cache.
export class SingleFlight {
  private readonly running = new Map<string, Promise<unknown>>();
  run<T>(key: string, work: () => Promise<T>): Promise<T> {
    const existing = this.running.get(key);
    if (existing) return existing as Promise<T>;
    const result = Promise.resolve().then(work).finally(() => { this.running.delete(key); });
    this.running.set(key, result);
    return result;
  }
}
