import express from 'express';

export class RequestHandler {
	api: express.Express;

	constructor() {
		this.api = express();
		this
			.api.route("/").get((_, res) => {
			res.statusCode = 200;
			res.json({
				status: "OK",
			});
		})
	}

}
