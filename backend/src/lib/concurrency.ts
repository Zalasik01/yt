/** Executa fn sobre items com no máximo `limit` promessas simultâneas. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, base_delay_ms = 1500): Promise<T> {
  let last_error: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      last_error = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, base_delay_ms * 2 ** (attempt - 1)));
    }
  }
  throw last_error;
}
