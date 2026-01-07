export const expandPath = (path: string): string => {
	if (!path.startsWith('~')) return path;

	const home = Bun.env.HOME ?? Bun.env.USERPROFILE;
	if (!home) return path;

	if (path === '~') return home;
	if (!path.startsWith('~/')) return path;

	const base = home.endsWith('/') ? home.slice(0, -1) : home;
	return `${base}/${path.slice(2)}`;
};

export const fileExists = async (path: string): Promise<boolean> => {
	return Bun.file(path).exists();
};

export const dirExists = async (path: string): Promise<boolean> => {
	const stat = await Bun.file(path)
		.stat()
		.catch(() => null);

	if (!stat) return false;
	return stat.isDirectory();
};
