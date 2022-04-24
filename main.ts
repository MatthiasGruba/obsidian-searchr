import { Plugin } from 'obsidian';
import * as http from 'http';
import { RequestHandler } from './src/request-handler';

interface ObsidianSearchrSettings {
}

const DEFAULT_SETTINGS: ObsidianSearchrSettings = {}

export default class ObsidianSearchrPlugin extends Plugin {
	settings: ObsidianSearchrSettings;
	server: http.Server | null = null;

	async onload() {
		await this.loadSettings();
		this.setupServer();
	}

	onunload() {
		this.server.close();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private setupServer(): void {
		const port = 27123;
		const host = '127.0.0.1';

		const requestHandler = new RequestHandler(this.app);
		this.server = http.createServer(requestHandler.api);
		this.server.listen(port, host);

		console.log(`SearchR API listening on http://${host}/${port}`);
	}
}

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: MyPlugin;
//
// 	constructor(app: App, plugin: MyPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}
//
// 	display(): void {
// 		const { containerEl } = this;
//
// 		containerEl.empty();
//
// 		containerEl.createEl('h2', { text: 'Settings for my awesome plugin.' });
//
// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					console.log('Secret: ' + value);
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveSettings();
// 				}));
// 	}
// }
