import ora from 'ora';

type Spinner = {
	text: string;
	start: (text?: string) => Spinner;
	succeed: (text?: string) => Spinner;
	stop: () => Spinner;
};

const createSilentSpinner = (text: string): Spinner => {
	const spinner: Spinner = {
		text,
		start: (nextText?: string) => {
			if (nextText) {
				spinner.text = nextText;
			}
			return spinner;
		},
		succeed: (nextText?: string) => {
			if (nextText) {
				spinner.text = nextText;
			}
			return spinner;
		},
		stop: () => spinner,
	};
	return spinner;
};

export const createSpinner = (text: string, silent: boolean): Spinner => {
	if (silent) return createSilentSpinner(text);
	return ora(text);
};
