type V = "2.0";
export type Params = any[] | object;

export interface ErrorObject {
	code: number;
	message: string;
	data?: any;
}

export interface CallMessage {
	method: string;
	params: Params;
	id?: string;
	jsonrpc: V;
}

export interface ResultMessage {
	result: any;
	id: string;
	jsonrpc: V;
}

export interface ErrorMessage {
	error: ErrorObject;
	id: string | null;
	jsonrpc: V;
}

export type Message = CallMessage | ResultMessage | ErrorMessage;

export interface IO {
	onData(str: string): void;
	sendData(m: string): void;
}
