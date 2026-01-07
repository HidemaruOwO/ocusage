const pad2 = (value: number): string => value.toString().padStart(2, '0');

const MONTH_SHORT_NAMES = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

export const formatDate = (timestamp: number): string => {
	const date = new Date(timestamp);
	const year = date.getFullYear();
	const month = pad2(date.getMonth() + 1);
	const day = pad2(date.getDate());
	return `${year}-${month}-${day}`;
};

export const formatDateHuman = (timestamp: number): string => {
	const date = new Date(timestamp);
	const month = MONTH_SHORT_NAMES[date.getMonth()];
	const day = date.getDate();
	const year = date.getFullYear();
	return `${month} ${day}, ${year}`;
};

export const formatTime = (timestamp: number): string => {
	const date = new Date(timestamp);
	const hours = pad2(date.getHours());
	const minutes = pad2(date.getMinutes());
	const seconds = pad2(date.getSeconds());
	return `${hours}:${minutes}:${seconds}`;
};

export const parseDate = (dateStr: string): Date | null => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);

	if (date.getFullYear() !== year) return null;
	if (date.getMonth() !== month - 1) return null;
	if (date.getDate() !== day) return null;

	return date;
};

export const getWeekNumber = (date: Date): number => {
	const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const day = utcDate.getUTCDay() || 7;
	utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);

	const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
	const diffDays = Math.floor((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1;

	return Math.ceil(diffDays / 7);
};

export const getDayStart = (date: Date): Date => {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getWeekStart = (date: Date): Date => {
	const day = date.getDay();
	const offset = (day + 6) % 7;
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
};

export const getMonthStart = (date: Date): Date => {
	return new Date(date.getFullYear(), date.getMonth(), 1);
};
