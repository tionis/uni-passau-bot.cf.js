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

export { getISOWeek, getISOWeekYear };