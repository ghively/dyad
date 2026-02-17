const locks = new Map<number | string, Promise<void>>();

/**
 * Executes a function with a lock on the lock ID.
 * Ensures that operations for the same lock ID are executed sequentially.
 * If an operation fails, the lock is released for subsequent operations.
 *
 * @param lockId The lock ID to lock
 * @param fn The function to execute with the lock
 * @returns Result of the function
 */
export function withLock<T>(
  lockId: number | string,
  fn: () => Promise<T>,
): Promise<T> {
  // Get the promise currently at the end of the chain
  const previousLock = locks.get(lockId) || Promise.resolve();

  // Chain the new operation onto the existing promise
  const nextLock = previousLock.then(async () => {
    return await fn();
  });

  // Create a "safe" promise that resolves regardless of success or failure
  // This ensures the chain continues even if an operation fails
  const safeNextLock = nextLock.catch(() => {});

  // Update the map to point to the new end of the chain
  locks.set(lockId, safeNextLock);

  // Clean up when the operation completes (success or failure)
  // If no new locks have been added, remove the entry from the map to prevent memory leaks
  safeNextLock.then(() => {
    if (locks.get(lockId) === safeNextLock) {
      locks.delete(lockId);
    }
  });

  // Return the promise that reflects the actual result of the operation
  return nextLock;
}
