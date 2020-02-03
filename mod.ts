import * as log from "https://deno.land/std/log/mod.ts";

import { Params, Message, ErrorMessage, ResultMessage, CallMessage, ErrorObject, IO } from "./types.d.ts";
const V = "2.0";

function createErrorMessage(id: string | null, code: number, message: string, data?: any): ErrorMessage {
	let error = {code, message } as ErrorObject;
	if (data) { error.data = data; }
	return {id, error, jsonrpc:V};
}

function createResultMessage(id: string, result: any): ResultMessage {
	return {id, result, jsonrpc:V};
}

function createCallMessage(method: string, params: Params, id?: string): CallMessage {
	let message = {method, params, jsonrpc:V} as CallMessage;
	if (id) { message.id = id; }
	return message;
}

export default class JsonRpc {
	_interface = new Map<string, Function>();
	_pendingPromises = new Map<string, {resolve:Function, reject:Function}>();

	constructor(readonly _io: IO) {
		_io.onData = m => this._onData(m);
	}

	expose(name: string, method: Function) {
		this._interface.set(name, method);
	}

	async call(method: string, params: Params): Promise<any> {
		let id = Math.random().toString();
		let message = createCallMessage(method, params, id);
		return new Promise((resolve, reject) => {
			this._pendingPromises.set(id, {resolve, reject})
			this._send(message);
		});
	}

	notify(method: string, params: Params) {
		let message = createCallMessage(method, params);
		this._send(message);
	}

	_send(message: Message | Message[]) {
		const str = JSON.stringify(message);
		log.debug("[jsonrpc] sending", str);
		this._io.sendData(str);
	}

	_onData(str: string) {
		log.debug("[jsonrpc] received", str);

		let message: Message | Message[];
		try {
			message = JSON.parse(str);
		} catch (e) {
			let reply = createErrorMessage(null, -32700, e.message);
			this._send(reply);
			return;
		}

		let reply: Message | Message[] | null;
		if (message instanceof Array) {
			let mapped = message.map(m => this._processMessage(m)).filter(m => m) as Message[];
			reply = (mapped.length ? mapped : null);
		} else {
			reply = this._processMessage(message);
		}

		reply && this._send(reply);
	}

	_processMessage(message: Message): Message | null {
		if ("method" in message) { // call
			const method = this._interface.get(message.method);
			if (!method) {
				return (message.id ? createErrorMessage(message.id, -32601, "method not found") : null);
			}

			try {
				const result = (message.params instanceof Array ? method(...message.params) : method(message.params));
				return (message.id ? createResultMessage(message.id, result) : null);
			} catch (e) {
				return (message.id ? createErrorMessage(message.id, -32000, e.message) : null);
			}

		} else if (message.id) { // result/error

			let promise = this._pendingPromises.get(message.id);
			if (!promise) { throw new Error(`Received a non-matching response id "${message.id}"`); }
			this._pendingPromises.delete(message.id);
			("error" in message ? promise.reject(message.error) : promise.resolve(message.result));

		} else {
			throw new Error("Received a non-call non-id JSON-RPC message");
		}

		return null;
	}
}
