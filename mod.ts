/**
 * Typed wrapper for {@link Deno.KvEntry}.
 */
export type TkvEntry<K extends Deno.KvKey, T> = Deno.KvEntry<T> & {
  key: readonly [...K];
};

/**
 * Typed wrapper for {@link Deno.KvEntryMaybe}.
 */
export type TkvEntryMaybe<K extends Deno.KvKey, T> = TkvEntry<K, T> | {
  key: readonly [...K];
  value: null;
  versionstamp: null;
};

/**
 * Typed wrapper for {@link Deno.KvListSelector}.
 */
export type TkvListSelector<K extends Deno.KvKey> =
  | { prefix: tkvKeyPrefix<K> }
  | { prefix: tkvKeyPrefix<K>; start: readonly [...K] }
  | { prefix: tkvKeyPrefix<K>; end: readonly [...K] }
  | { start: readonly [...K]; end: readonly [...K] };

/**
 * Typed wrapper for {@link Deno.KvListIterator}.
 */
export type TkvListIterator<K extends Deno.KvKey, T> =
  & Deno.KvListIterator<T>
  & AsyncIterableIterator<TkvEntry<K, T>>;

/**
 * Gives all possible prefixes for a given key type.
 */
export type tkvKeyPrefix<Key extends Deno.KvKey> = Key extends
  readonly [infer Prefix, ...infer Rest extends Deno.KvKey]
  ? readonly [Prefix] | readonly [Prefix, ...tkvKeyPrefix<Rest>]
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
    key: readonly [...K],
    options?: Parameters<Deno.Kv["get"]>[1],
  ): Promise<TkvEntryMaybe<K, T>> {
    return this.db.get<T>(key, options) as Promise<TkvEntryMaybe<K, T>>;
  }

  /**
   * Typed wrapper for {@link Deno.Kv.set}.
   */
  set(
    key: readonly [...K],
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
    key: readonly [...K],
    versionstamp: Deno.AtomicCheck["versionstamp"],
    value: T,
    options?: Parameters<Deno.AtomicOperation["set"]>[2],
  ): ReturnType<Deno.AtomicOperation["commit"]> {
    return this.db.atomic()
      .check({ key, versionstamp })
      .set(key, value, options)
      .commit();
  }

  /**
   * Typed wrapper for {@link Deno.Kv.delete}.
   */
  delete(key: readonly [...K]): ReturnType<Deno.Kv["delete"]> {
    return this.db.delete(key);
  }

  /**
   * Shorthand for {@link Deno.AtomicOperation.check} and {@link Deno.AtomicOperation.delete}.
   *
   * @returns The result of {@link Deno.AtomicOperation.commit}.
   */
  atomicDelete(
    key: readonly [...K],
    versionstamp: Deno.AtomicCheck["versionstamp"],
  ): ReturnType<Deno.AtomicOperation["commit"]> {
    return this.db.atomic()
      .check({ key, versionstamp })
      .delete(key)
      .commit();
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
}
