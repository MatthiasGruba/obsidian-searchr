import express from 'express';
import { enhanceSearchResults, fetchSearchResults } from './search';
import cors from "cors";

export class RequestHandler {
	api: express.Express;

	constructor() {
		this.api = express();
		this.api.use(cors());
		this.api.route("/").get(this.root);
		this.api.route("/search").get(this.getSearchResults.bind(this));
		this.api.route("/open").post(this.openPost.bind(this));
	}

	async root(
		req: express.Request,
		res: express.Response
	): Promise<void> {
		res.json({ status: 'OK' });
	}

	async getSearchResults(
		req: express.Request,
		res: express.Response
	): Promise<void> {
		const query = decodeURIComponent(req.query.query as string);
		const results = fetchSearchResults(query);
		const suggestions = enhanceSearchResults(results);

		res.json(suggestions);
	}

	async openPost(req: express.Request, res: express.Response): Promise<void> {
		const path = decodeURIComponent(req.query.path as string);

		app.workspace.openLinkText(path, "/", false);
		require('child_process').exec('open obsidian://open');

		res.json();
	}
}


