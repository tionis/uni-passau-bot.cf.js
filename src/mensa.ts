const mensa_base_url = "https://www.stwno.de/infomax/daten-extern/csv/UNI-P/";

interface MensaPrice {
	stud: number;
	bed: number;
	gast: number;
}

interface MensaEntry {
	date: Date;
	day: string;
	category: string;
	name: string;
	labels: string[];
	price: MensaPrice;
}

async function getMensaDataForWeek(week: number): Promise<MensaEntry[]> {
	// 1. Fetch csv from mensa_base_url + week + ".csv"
	const response_text = await (await fetch(mensa_base_url + week + ".csv")).text();
	// 2. change encoding from ISO-8859-1 to UTF-8
	const textEncoder = new TextEncoder();
	const textDecoder = new TextDecoder("ISO-8859-1");
	const responseBuffer = textEncoder.encode(response_text);
	const csv_text = textDecoder.decode(responseBuffer);
	// 3. parse csv (semicolon separated) to array of objects
	const lines = csv_text.split("\n");
	let result = [];
	for (let i = 1; i < lines.length; i++) {
		// csv header: datum;tag;warengruppe;name;kennz;preis;stud;bed;gast
		// labels has brackets, so we need to remove them
		if (lines[i] === "") {
			continue;
		}
		const line = lines[i].split(";");
		const entry: MensaEntry = {
			date: new Date(line[0]),
			day: line[1],
			category: line[2],
			name: line[3],
			labels: line[4].replace("(", "").replace(")", "").split(","),
			price: {
				stud: parseFloat(line[6].replace(",", ".")),
				bed: parseFloat(line[7].replace(",", ".")),
				gast: parseFloat(line[8].replace(",", ".")),
			},
		};
		result.push(entry);
	}
	// 4. return array of objects
	return result;
}

export { getMensaDataForWeek };
export type { MensaEntry, MensaPrice };