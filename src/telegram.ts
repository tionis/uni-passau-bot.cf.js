import { Env } from './types';

async function tgGet(env: Env, methodName: string, params: any = null): Promise<Response> {
	let query = ''
	if (params) {
		query = '?' + new URLSearchParams(params).toString()
	}
	return await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/${methodName}${query}`)
}

/*
 * Sends a simple (markdown) message to a chat
 * @param env The worker env
 * @param chat_id The chat id to send the message to
 * @param text The text of the message
 */
async function tgSendMessage(env: Env, chat_id: number, text: string): Promise<Response> {
	return await tgGet(env, 'sendMessage', {
		chat_id: chat_id,
		text: text,
		parse_mode: 'Markdown', // MarkdownV2 needs more work with escaping
		reply_markup: "{\"remove_keyboard\": true}"
	})
}

export { tgGet, tgSendMessage };