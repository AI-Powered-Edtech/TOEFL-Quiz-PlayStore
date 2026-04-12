/**
 * Wraps a promise with a timeout.
 * @param promise The promise to wait for.
 * @param msTimeout Timeout in milliseconds.
 * @param label Optional label for the error message.
 */
export async function withTimeout<T>(promise: Promise<T>, msTimeout: number, label: string = 'Operation'): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`${label} timed out after ${msTimeout}ms`));
        }, msTimeout);

        promise
            .then((value) => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch((reason) => {
                clearTimeout(timer);
                reject(reason);
            });
    });
}
