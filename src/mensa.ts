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
	const response_array_buffer = await (await fetch(mensa_base_url + week + ".csv")).arrayBuffer();
	// 2. change encoding from ISO-8859-1 to UTF-8
	const textDecoder = new TextDecoder("ISO-8859-1");
	const csv_text = textDecoder.decode(response_array_buffer)
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
		// name may contain labels in a comma separated list in brackets at the end
		// we need to split them into separate labels
		const name = line[3].replace(/(\(.*\))/, "").trim();
		const labels_str = line[3].match(/(\(.*\))/);
		let labels = labels_str !== null ? labels_str[0].replace("(", "").replace(")", "").split(",").map((label) => label.trim()) : []
		const entry: MensaEntry = {
			date: new Date(line[0].replace(/(.*)\.(.*)\.(.*)/, '$3-$2-$1')),
			day: line[1],
			category: line[2],
			name: name,
			labels: labels,
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