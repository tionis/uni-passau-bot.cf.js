import { Env } from './types';
import { tgSendMessage } from './telegram';
import { Message } from '@telegraf/types';
import { getMensaDataForWeek, MensaEntry } from './mensa';
import { getISOWeek, getISOWeekYear } from './util';

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
	let parsedData = JSON.parse(cached);
	parsedData = parsedData.map((entry: any) => {
		return {
			date: new Date(entry.date),
			day: entry.day,
			category: entry.category,
			name: entry.name,
			labels: entry.labels,
			price: {
				stud: entry.price.stud,
				bed: entry.price.bed,
				gast: entry.price.gast,
			},
		};
	});
	return parsedData as MensaEntry[];
}

async function getPrettyMensaInfoForDate(env: Env, date: Date): Promise<string> {
	const data = await getMensaInfo(env, getISOWeek(date));
	const weekday = date.toLocaleDateString('de-DE', { weekday: 'long' });
	let prettyData = `*Essen am ${weekday} (${date.toLocaleDateString('de-DE')}):*\n`;
	const today = new Date();
	for (const entry of data) {
		if (entry.date.getDate() === today.getDate()) {
			prettyData += `*${entry.category}*: ${entry.name} (${entry.price.stud.toFixed(2).replace('.', ',')}€)\n`;
		}
	}
	return prettyData;
}

async function getPrettyMensaInfoForWeek(env: Env, weekNumber: number): Promise<string> {
	const data = await getMensaInfo(env, weekNumber);
	const year = getISOWeekYear(new Date());
	let prettyData = `*Essen für KW${weekNumber} (${year}):*`;
	let dates = data.map((entry) => entry.date.toISOString().split('T')[0]).filter((value, index, self) => self.indexOf(value) === index).sort();
	for (const date of dates) {
		const entries = data.filter((entry) => entry.date.toISOString().split('T')[0] === date);
		const weekday = entries[0].date.toLocaleDateString('de-DE', { weekday: 'long' });
		prettyData += `\n*${weekday} (${entries[0].date.toLocaleDateString('de-DE')})*:\n`;
		for (const entry of entries) {
			prettyData += `*${entry.category}*: ${entry.name} (${entry.price.stud.toFixed(2).replace('.', ',')}€)\n`;
		}
	}
	console.log(prettyData);
	return prettyData;
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

export { handleMessage, getPrettyMensaInfoForDate, getPrettyMensaInfoForWeek };