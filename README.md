# Deno Typed KV

[![JSR](https://jsr.io/badges/@smol/tkv)](https://jsr.io/@smol/tkv)

Add some type safety to your Deno KV store.

## Example

```ts
import { Tkv } from "https://deno.land/x/tkv/mod.ts";

const kv = await Deno.openKv();

// Enforce all entries under the key `users/{id}` to be of type User
const userStore = new Tkv<["users", id: string], User>(kv);

// Use userStore the same way as a regular KV instance.
await userStore.set(["users", "ry"], { name: "Ryan Dahl" }); // Key and value are type checked
const userEntry = await userStore.get(["users", "ry"]);
console.log(userEntry.value.name); // Prints: Ryan Dahl
```
