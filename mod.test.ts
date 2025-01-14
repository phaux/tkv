import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.221.0/assert/mod.ts";
import { Tkv } from "./mod.ts";

const db = await Deno.openKv();

// clear db
for await (const entry of db.list({ prefix: [] })) {
  await db.delete(entry.key);
}

Deno.test("works", async () => {
  const fooStore = new Tkv<["foo", fooId: string], string>(db);

  const resultA = await fooStore.set(["foo", "a"], "asd");
  const entryA = await fooStore.get(["foo", "a"]);
  assertEquals(entryA, {
    key: ["foo", "a"],
    value: "asd",
    versionstamp: resultA.versionstamp,
  });

  const resultB = await fooStore.set(["foo", "b"], "qwe");
  const entryB = await fooStore.get(["foo", "b"]);
  assertEquals(entryB, {
    key: ["foo", "b"],
    value: "qwe",
    versionstamp: resultB.versionstamp,
  });

  {
    const entries = await Array.fromAsync(fooStore.list({ prefix: ["foo"] }));
    assertEquals(entries, [
      { key: ["foo", "a"], value: "asd", versionstamp: resultA.versionstamp },
      { key: ["foo", "b"], value: "qwe", versionstamp: resultB.versionstamp },
    ]);
  }

  {
    await fooStore.delete(["foo", "a"]);
    const entry = await fooStore.get(["foo", "a"]);
    assertEquals(entry, { key: ["foo", "a"], value: null, versionstamp: null });
  }

  {
    const entries = await Array.fromAsync(fooStore.list({ prefix: ["foo"] }));
    assertEquals(entries.length, 1);
  }
});

Deno.test("atomic works", async () => {
  const barStore = new Tkv<["bar", string], string>(db);

  const resultA = await barStore.atomicSet(["bar", "a"], null, "asd");
  assert(resultA.ok);
  const entryA = await barStore.get(["bar", "a"]);
  assertEquals(entryA, {
    key: ["bar", "a"],
    value: "asd",
    versionstamp: resultA.versionstamp,
  });

  {
    const result = await barStore.atomicSet(["bar", "a"], null, "asdf");
    assert(!result.ok);
  }

  {
    const result = await barStore.atomicSet(
      ["bar", "b"],
      resultA.versionstamp,
      "qwe",
    );
    assert(!result.ok);
  }

  const resultB = await barStore.atomicSet(["bar", "b"], null, "qwe");
  assert(resultB.ok);
  const entryB = await barStore.get(["bar", "b"]);
  assertEquals(entryB, {
    key: ["bar", "b"],
    value: "qwe",
    versionstamp: resultB.versionstamp,
  });

  const resultA2 = await barStore.atomicSet(
    ["bar", "a"],
    resultA.versionstamp,
    "asdf",
  );
  assert(resultA2.ok);
  const entryA2 = await barStore.get(["bar", "a"]);
  assertEquals(entryA2, {
    key: ["bar", "a"],
    value: "asdf",
    versionstamp: resultA2.versionstamp,
  });

  {
    const result = await barStore.atomicSet(
      ["bar", "a"],
      resultA.versionstamp,
      "asdfg",
    );
    assert(!result.ok);
  }

  {
    const entries = await Array.fromAsync(barStore.list({ prefix: ["bar"] }));
    assertEquals(entries, [
      { key: ["bar", "a"], value: "asdf", versionstamp: resultA2.versionstamp },
      { key: ["bar", "b"], value: "qwe", versionstamp: resultB.versionstamp },
    ]);
  }

  {
    const result = await barStore.atomicDelete(
      ["bar", "b"],
      resultB.versionstamp,
    );
    assert(result.ok);
    const entry = await barStore.get(["bar", "b"]);
    assertEquals(entry, { key: ["bar", "b"], value: null, versionstamp: null });
  }

  {
    const entries = await Array.fromAsync(barStore.list({ prefix: ["bar"] }));
    assertEquals(entries.length, 1);
  }

  {
    const result = await barStore.atomicDelete(
      ["bar", "a"],
      resultA.versionstamp,
    );
    assert(!result.ok);
  }

  {
    const result = await barStore.atomicDelete(
      ["bar", "a"],
      resultA2.versionstamp,
    );
    assert(result.ok);
    const entry = await barStore.get(["bar", "a"]);
    assertEquals(entry, { key: ["bar", "a"], value: null, versionstamp: null });
  }

  {
    const entries = await Array.fromAsync(barStore.list({ prefix: ["bar"] }));
    assertEquals(entries.length, 0);
  }

  await barStore.atomicUpdate(["bar", "c"], (v) => {
    assertEquals(v, undefined);
    return "a";
  });
  assertEquals((await barStore.get(["bar", "c"])).value, "a");
  await barStore.atomicUpdate(["bar", "c"], (v) => {
    assertEquals(v, "a");
    return undefined;
  });
  assertEquals((await barStore.get(["bar", "c"])).value, null);
});
