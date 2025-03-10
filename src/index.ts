import { getMensaDataForWeek } from './mensa';
import { Hono } from 'hono';
import { Env } from './types';
import { tgGet } from './telegram';
import { handleMessage } from './bot';
import { Update } from '@telegraf/types';

const webhook_path = '/webhook/update';
const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => {
	return c.text('Hi!');
});

app.get('/mensa', async (c) => {
	return c.json(await getMensaDataForWeek(1));
});

app.get('/mensa/:week', async (c) => {
	return c.json(await getMensaDataForWeek(parseInt(c.req.param('week'))));
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
			return c.json({ error: 'Failed to register webhook', response: r, webhookUrl: webhookUrl });
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
