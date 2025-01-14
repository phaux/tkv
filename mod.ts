/**
 * Typed wrapper for {@link Deno.KvEntry}.
 */
export type TkvEntry<K extends Deno.KvKey, T> = Deno.KvEntry<T> & {
  key: K;
};

/**
 * Typed wrapper for {@link Deno.KvEntryMaybe}.
 */
export type TkvEntryMaybe<K extends Deno.KvKey, T> =
  | TkvEntry<K, T>
  | {
    key: K;
    value: null;
    versionstamp: null;
  };

/**
 * Typed wrapper for {@link Deno.KvListSelector}.
 */
export type TkvListSelector<K extends Deno.KvKey> =
  | { prefix: tkvKeyPrefix<K> }
  | { prefix: tkvKeyPrefix<K>; start: K }
  | { prefix: tkvKeyPrefix<K>; end: K }
  | { start: K; end: K };

/**
 * Typed wrapper for {@link Deno.KvListIterator}.
 */
export type TkvListIterator<K extends Deno.KvKey, T> =
  & Deno.KvListIterator<T>
  & AsyncIterableIterator<TkvEntry<K, T>>;

/**
 * Gives all possible prefixes for a given key type.
 */
export type tkvKeyPrefix<Key extends Deno.KvKey> = Key extends readonly [
  infer Prefix,
  ...infer Rest extends Deno.KvKey,
] ? readonly [Prefix] | readonly [Prefix, ...tkvKeyPrefix<Rest>]
  : never;

/**
 * Typed wrapper for {@link Deno.Kv}.
 *
 * @template K Key type. For example: `["usersByEmail", email: string]`.
 * @template T Value type. Type of values stored at the given keys.
 */
export class Tkv<K extends Deno.KvKey, T> {
  constructor(readonly db: Deno.Kv) {}

  /**
   * Typed wrapper for {@link Deno.Kv.get}.
   */
  get(
    key: K,
    options?: Parameters<Deno.Kv["get"]>[1],
  ): Promise<TkvEntryMaybe<K, T>> {
    return this.db.get<T>(key, options) as Promise<TkvEntryMaybe<K, T>>;
  }

  /**
   * Typed wrapper for {@link Deno.Kv.set}.
   */
  set(
    key: K,
    value: T,
    options?: Parameters<Deno.Kv["set"]>[2],
  ): ReturnType<Deno.Kv["set"]> {
    return this.db.set(key, value, options);
  }

  /**
   * Shorthand for {@link Deno.AtomicOperation.check} and {@link Deno.AtomicOperation.set}.
   *
   * @returns The result of {@link Deno.AtomicOperation.commit}.
   */
  atomicSet(
    key: K,
    versionstamp: Deno.AtomicCheck["versionstamp"],
    value: T,
    options?: Parameters<Deno.AtomicOperation["set"]>[2],
  ): ReturnType<Deno.AtomicOperation["commit"]> {
    return this.db
      .atomic()
      .check({ key, versionstamp })
      .set(key, value, options)
      .commit();
  }

  /**
   * Typed wrapper for {@link Deno.Kv.delete}.
   */
  delete(key: K): ReturnType<Deno.Kv["delete"]> {
    return this.db.delete(key);
  }

  /**
   * Shorthand for {@link Deno.AtomicOperation.check} and {@link Deno.AtomicOperation.delete}.
   *
   * @returns The result of {@link Deno.AtomicOperation.commit}.
   */
  atomicDelete(
    key: K,
    versionstamp: Deno.AtomicCheck["versionstamp"],
  ): ReturnType<Deno.AtomicOperation["commit"]> {
    return this.db.atomic().check({ key, versionstamp }).delete(key).commit();
  }

  /**
   * Shortcut for {@link Tkv.get} and then {@link Tkv.atomicSet} (or {@link Tkv.atomicDelete} if updater returns undefined).
   */
  async atomicUpdate(
    key: K,
    updater: (value: T | undefined) => T | undefined | Promise<T | undefined>,
    setOptions?: Parameters<Deno.Kv["set"]>[2],
    getOptions?: Parameters<Deno.Kv["get"]>[1],
  ): Promise<ReturnType<Deno.AtomicOperation["commit"]>> {
    const { value, versionstamp } = await this.get(key, getOptions);
    const newValue = await updater(versionstamp == null ? undefined : value);
    if (newValue !== undefined) {
      return this.atomicSet(key, versionstamp, newValue, setOptions);
    } else {
      return this.atomicDelete(key, versionstamp);
    }
  }

  /**
   * Typed wrapper for {@link Deno.Kv.list}.
   */
  list(
    selector: TkvListSelector<K>,
    options?: Parameters<Deno.Kv["list"]>[1],
  ): TkvListIterator<K, T> {
    return this.db.list<T>(selector, options) as TkvListIterator<K, T>;
  }

  /**
   * Typed wrapper for {@link Deno.Kv.watch}.
   */
  watch(
    keys: K[],
    options?: Parameters<Deno.Kv["watch"]>[1],
  ): ReadableStream<TkvEntryMaybe<K, T>[]> {
    return this.db.watch(keys, options) as ReadableStream<
      TkvEntryMaybe<K, T>[]
    >;
  }
}
