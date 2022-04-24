import express from 'express';
import { App } from 'obsidian';
import * as fuzzysort from 'fuzzysort';

export class RequestHandler {
	app: App;
	api: express.Express;

	constructor(
		app: App,
	) {
		this.app = app;
		this.api = express();
		this.api.route("/").get(this.root);
		// this.api.route("/search").get(this.search().bind(this));
		this.api.route("/search/quick").get(this.quickSearch.bind(this));
		this.api.route("/open").post(this.openPost.bind(this));
	}

	async root(
		req: express.Request,
		res: express.Response
	): Promise<void> {
		res.json({ status: 'OK' });
	}

	async quickSearch(
		req: express.Request,
		res: express.Response
	): Promise<void> {
		const query: string = req.query.query as string;
		const files = this.app.vault.getMarkdownFiles()
			.map(f => ({ name: f.name.split('.md')[0], path: f.path }));

		const results = fuzzysort.go(query, files, {
			key: 'name',
			limit: 10,
			threshold: -1000
		}).map(res => res.obj);

		res.json(results);
	}

	async search(
		req: express.Request,
		res: express.Response
	): Promise<void> {
		const query = req.query.query as string;
		const files = this.app.vault.getMarkdownFiles()
			.map(f => ({ name: f.name.split('.md')[0], path: f.path }));

		const results = fuzzysort.go(query, files, {
			key: 'name',
			limit: 10,
			threshold: -1000
		}).map(res => res.obj);

		res.json(results);
	}

	async openPost(req: express.Request, res: express.Response): Promise<void> {
		const path = req.query.path as string;

		this.app.workspace.openLinkText(path, "/", false);
		require('child_process').exec('open obsidian://open');

		res.json();
	}


}
