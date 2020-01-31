import { test } from "https://deno.land/std/testing/mod.ts";
import { assertEquals, assertThrowsAsync } from "https://deno.land/std/testing/asserts.ts";
import JsonRpc from "./mod.ts";
import { IO } from "./types.d.ts";

let client, server : IO;

client = {
	onData(s: string) { console.log(s); },
	sendData(s: string) { server.onData(s); }
}

server = {
	onData(s: string) { console.log(s); },
	sendData(s: string) { client.onData(s); }
}

let crpc = new JsonRpc(client);
let srpc = new JsonRpc(server);

srpc.expose("echo", data=>data);

test("echo", async function() {
	const params = {a:"b"};
	let result = await crpc.call("echo", params);
	assertEquals(params, result);
});

test("method not found", async function() {
	await assertThrowsAsync(async () => crpc.call("not-found", {}));
});
