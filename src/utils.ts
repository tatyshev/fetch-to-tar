export const later = (fn: () => void) => setTimeout(fn, 0);

export const toPromise = <T>(target: T | Promise<T>) => {
  const t = typeof target === 'function' ? target() : target;
  return t instanceof Promise ? t : Promise.resolve(t);
};
