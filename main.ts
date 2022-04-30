import { Plugin, TFile } from 'obsidian';
import * as http from 'http';
import { RequestHandler } from './src/request-handler';
import { addToIndex, loadNotes, removeFromIndex, removeFromIndexByPath } from './src/search';

export default class ObsidianSearchrPlugin extends Plugin {
	server: http.Server | null = null;

	async onload() {
		await this.registerListeners();
		this.setupServer();
	}

	onunload() {
		this.server.close();
	}

	private setupServer(): void {
		const port = 39393;
		const host = '127.0.0.1';

		const requestHandler = new RequestHandler();
		this.server = http.createServer(requestHandler.api);
		this.server.listen(port, host);
	}

	async registerListeners(): Promise<void> {
		return new Promise((resolve) => {
			app.workspace.onLayoutReady(async () => {
				this.registerEvent(
					app.vault.on('create', file => {
						addToIndex(file)
					}),
				)
				this.registerEvent(
					app.vault.on('delete', file => {
						removeFromIndex(file)
					}),
				)
				this.registerEvent(
					app.vault.on('modify', async file => {
						removeFromIndex(file)
						await addToIndex(file)
					}),
				)
				this.registerEvent(
					app.vault.on('rename', async (file, oldPath) => {
						if (file instanceof TFile && file.path.endsWith('.md')) {
							removeFromIndexByPath(oldPath)
							await addToIndex(file)
						}
					}),
				)

				await loadNotes();
				resolve();
			});
		})
	}
}
