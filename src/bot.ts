import { Env } from './types';
import { tgSendMessage } from './telegram';
import { Message } from '@telegraf/types';
import { getMensaDataForWeek, MensaEntry } from './mensa';

// Returns the ISO week of the date.
function getISOWeek(date: Date): number {
	const tempDate = new Date(date.getTime());
	tempDate.setHours(0, 0, 0, 0);
	// Thursday in current week decides the year.
	tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
	// January 4 is always in week 1.
	const week1 = new Date(tempDate.getFullYear(), 0, 4);
	// Adjust to Thursday in week 1 and count number of weeks from date to week1.
	return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// Returns the four-digit year corresponding to the ISO week of the date.
function getISOWeekYear(date: Date): number {
	const tempDate = new Date(date.getTime());
	tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
	return tempDate.getFullYear();
}

async function getMensaInfo(env: Env, weekNumber: number): Promise<MensaEntry[]> {
	const lookup_key = `mensa/info/${weekNumber}`;
	const cached = await env.UNI_PASSAU_BOT_CACHE.get(lookup_key);
	if (cached === null) {
		const data = await getMensaDataForWeek(weekNumber);
		await env.UNI_PASSAU_BOT_CACHE.put(
			lookup_key,
			JSON.stringify(data),
			{ expirationTtl: 60 * 60 } // Cache data from mensa for an hour
		);
		return data;
	}
	return JSON.parse(cached) as MensaEntry[];
}

async function getPrettyMensaInfoForDate(env: Env, date: Date): Promise<string> {
	const data = await getMensaInfo(env, getISOWeek(date));
	return "```json\n" + JSON.stringify(data, null, 2) + "\n```";
}

async function getPrettyMensaInfoForWeek(env: Env, weekNumber: number): Promise<string> {
	const data = await getMensaInfo(env, weekNumber);
	return "```json\n" + JSON.stringify(data, null, 2) + "\n```";
}

async function handleMessage(env: Env, message: Message) {
	if ('text' in message) {
		const msg = message as Message.TextMessage;
		switch (msg.text) {
			case '/start':
				await tgSendMessage(env, msg.chat.id, "Hello! I'm a unofficial Bot for the University of Passau. How can I help you today?");
				break;
			case '/mensa':
			case '/mensatoday':
			case '/mensaToday':
			case '/m':
			case '/f':
			case '/food':
			case '/foodtoday':
            case 'Food for today':
				const today = new Date();
				const mensaInfoToday = await getPrettyMensaInfoForDate(env, today);
				await tgSendMessage(env, msg.chat.id, mensaInfoToday);
				break;
            case '/mensatomorrow':
            case '/mensaTomorrow':
            case '/mt':
			case '/ft':
            case '/foodtomorrow':
            case '/foodTomorrow':
            case 'Food for tomorrow':
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const mensaInfoTomorrow = await getPrettyMensaInfoForDate(env, tomorrow);
                await tgSendMessage(env, msg.chat.id, mensaInfoTomorrow);
                break;
			case '/mensaWeek':
			case '/mensaweek':
			case '/mw':
			case '/foodweek':
            case 'Food for the week':
				const weekNumber = getISOWeek(new Date());
				const mensaInfoWeek = await getPrettyMensaInfoForWeek(env, weekNumber);
				await tgSendMessage(env, msg.chat.id, mensaInfoWeek);
				break;
			case '/mensaNextWeek':
			case '/mensanextweek':
			case '/mnw':
			case '/foodnextweek':
			case 'Food for next week':
				const nextWeekNumber = getISOWeek(new Date()) + 1;
				const mensaInfoNextWeek = await getPrettyMensaInfoForWeek(env, nextWeekNumber);
				await tgSendMessage(env, msg.chat.id, mensaInfoNextWeek);
				break
			case '/help':
				await tgSendMessage(
					env,
					msg.chat.id,
					'Available commands:\n/mensa - Get the food for today\n/mensaTomorrow - Get the food for tomorrow\n/mensaWeek - Get the food for the week\n/mensaNextWeek - Get the food for next week\n/help - Get this help message\n/contact - Send a message to the developer'
				);
				break;
			default:
			    const command = msg.text.split(' ')[0];
				switch (command) {
					case '/contact':
						const messageForDev = msg.text.replace('/contact', '').trim();
						if (messageForDev === '') {
							await tgSendMessage(env, msg.chat.id, 'Please provide a message to send to the developer after the command');
						}
						if (msg.from) {
							await tgSendMessage(
								env,
								parseInt(env.ADMIN_CHAT_ID),
								`Message from user ${msg.from.username} ID=${msg.from.id} in ChatID=${msg.chat.id}:\n${messageForDev}`
							);
							await tgSendMessage(env, msg.chat.id, 'Message sent to developer.');
						} else {
							await tgSendMessage(env, msg.chat.id, 'Unable to send message to developer. User information is missing.');
						}
						break;
					default:
						await tgSendMessage(env, msg.chat.id, "I don't know that command. Try /help");
						break;
				}
		}
	}
	// Ignore non text message for now
}

export { handleMessage };
