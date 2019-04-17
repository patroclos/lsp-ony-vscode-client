/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import * as net from 'net';
import * as cp from 'child_process';
import * as portastic from 'portastic'
import * as consolestream from 'console-stream'
import { workspace, ExtensionContext } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
	StreamInfo
} from 'vscode-languageclient';
import { editor } from './test/helper';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	// The server is implemented in node
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used

	let port = portastic.find({ min: 8000, max: 8100 });

	port.then(ports => {
		let p = ports[0]
		const DONT_START_INSTANCE = true
		if(!DONT_START_INSTANCE)
		{
			let server_instance = cp.spawn('C:/Users/Joshua/Documents/workspace/lsp-ony/build/lsp-ony.exe',
				[
					'--host', '127.0.0.1',
					'--port', p.toString()
				],
				{
					stdio: 'pipe'
				})
			//server_instance.stderr.pipe(process.stderr)
			server_instance.stderr.pipe(consolestream())

			context.subscriptions.push({
				dispose() {
					if (!server_instance.killed) {
						console.error("killing server instance")
						process.kill(-server_instance.pid)
					}
				}
			});
		}

		function createSocketConn(): Thenable<StreamInfo> {
			let sock = new net.Socket();
			let si: StreamInfo = {
				reader: sock,
				writer: sock
			}
			return new Promise((res, rej) => {
				setTimeout(() => {
					sock.connect(9000, '127.0.0.1');
					console.error("!!connection created")
					res(si)
				}, 500);
			});
		}

		// Options to control the language client
		let clientOptions: LanguageClientOptions = {
			// Register the server for pony flies and scratch buffers
			documentSelector: [{ scheme: 'file', language: 'pony' }, {scheme: 'untitled', language: 'pony'}],
			synchronize: {
				// Notify the server about file changes to '.clientrc files contained in the workspace
				fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
			}
		};

		// Create the language client and start the client.
		client = new LanguageClient(
			'ponyLanguageServer',
			'Pony Language Server',
			true ? createSocketConn : {
				run: {module: serverModule, transport: TransportKind.ipc},
				debug: {
					module: serverModule,
					transport: TransportKind.ipc,
					options: debugOptions
				}
			},
			clientOptions
		);

		// Start the client. This will also launch the server
		client.start();
		console.error("WAITING FOR Client IS READY");
		client.onReady().then(() => {
			console.error("Client IS READY");
		});
	});
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
