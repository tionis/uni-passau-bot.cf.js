import { getMensaDataForWeek } from './mensa';
import { Hono, Context } from 'hono';
import { html, raw } from 'hono/html';
import { Env } from './types';
import { tgGet } from './telegram';
import { handleMessage, getPrettyMensaInfoForDate, getPrettyMensaInfoForWeek } from './bot';
import { Update } from '@telegraf/types';
import { getISOWeek } from './util';
import { handle } from 'hono/cloudflare-pages';

const webhook_path = '/webhook/update';
const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => {
	return c.text('Hi!');
});

async function handle_week(c: Context, week: number) {
	const format = c.req.query('format');
	switch (format) {
		case 'json':
			return c.json(await getMensaDataForWeek(1));
		case 'jsonl':
			c.header('Content-Type', 'application/x-ndjson');
			const data = await getMensaDataForWeek(week);
			let jsonlOutput = '';
			for (const entry of data) {
				jsonlOutput += JSON.stringify(entry) + '\n';
			}
			return c.text(jsonlOutput);
		case 'pretty':
			const prettyData = await getPrettyMensaInfoForWeek(c.env, week);
			return c.text(prettyData);
		case 'html':
		case '':
		case undefined:
			const mensaData = await getMensaDataForWeek(week);
			const dates = mensaData
				.map((entry) => entry.date.toISOString().split('T')[0])
				.filter((value, index, self) => self.indexOf(value) === index)
				.sort();
			return c.html(
				html`<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta http-equiv="X-UA-Compatible" content="ie=edge" />
		<title>mensa</title>
		<link rel="stylesheet" href="/water.css" />
	</head>
	<body>
		<h1>Speiseplan für KW ${week}</h1>
${raw(
			dates
				.map((date) => {
					let out = '\t\t\t<h2>' + new Date(date).toLocaleDateString('de-DE', { weekday: 'long' })
					+', der ' + new Date(date).toLocaleDateString('de-DE') + '</h2>\n';
					out += '\t\t\t<ul>\n';
					const entries = mensaData.filter((entry) => entry.date.toISOString().split('T')[0] === date);
					for (const entry of entries) {
						out +=
							'\t\t\t\t<li><strong>' +
							entry.category +
							'</strong>: ' +
							entry.name +
							' (' +
							entry.price.stud.toFixed(2).replace('.', ',') +
							'€)</li>\n';
					}
					out += '\t\t\t</ul>\n';
					return out;
				})
				.join('')
		)}
	</body>
</html>`
			);
		default:
			console.log(format);
			c.status(400);
			return c.text('Invalid format');
	}
}

app.get('/mensa', async (c) => {
	const current_week = getISOWeek(new Date());
	return await handle_week(c, current_week);
});

app.get('/mensa/:week', async (c) => {
	return await handle_week(c, parseInt(c.req.param('week')));
});

app.post(webhook_path, async (c) => {
	// Telegram Webhooks are sent from 149.154.160.0/20 and 91.108.4.0/22
	// telegram only supports ipv4 addresses for the webhook

	// Check secret
	if (c.req.header('X-Telegram-Bot-Api-Secret-Token') !== c.env.WEBHOOK_SECRET) {
		c.status(403);
		return c.text('Unauthorized');
	}

	const update: Update = await c.req.json();
	if ('message' in update) {
		await handleMessage(c.env, update.message);
	}

	return c.text('ok');
});

app.get('/webhook/register', async (c) => {
	// Check that bearer token matches telegram token
	if (c.req.header('Authorization') === c.env.TELEGRAM_TOKEN) {
		const url = new URL(c.req.url);
		const webhookUrl = `https://${url.hostname}${webhook_path}`;
		const r: any = await (
			await tgGet(c.env, 'setWebhook', {
				url: webhookUrl,
				secret_token: c.env.WEBHOOK_SECRET,
			})
		).json();
		if ('ok' in r && r.ok) {
			return c.json({ status: 'ok', webhookUrl: webhookUrl });
		} else {
			c.status(500);
			return c.json({
				error: 'Failed to register webhook',
				response: r,
				webhookUrl: webhookUrl,
			});
		}
	} else {
		c.status(401);
		return c.json({ error: 'Unauthorized' });
	}
});

app.get('/webhook/unregister', async (c) => {
	// Check that bearer token matches telegram token
	if (c.req.header('Authorization') === c.env.TELEGRAM_TOKEN) {
		const r: any = await (
			await tgGet(c.env, 'setWebhook', {
				url: '',
			})
		).json();
		if ('ok' in r && r.ok) {
			return c.json({ status: 'ok' });
		} else {
			c.status(500);
			return c.json({ error: 'Failed to unregister webhook', response: r });
		}
	} else {
		c.status(401);
		return c.json({ error: 'Unauthorized' });
	}
});

export default app;
