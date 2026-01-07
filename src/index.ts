import { cli, define } from 'gunshi';
import dailyCommand from '@/commands/daily';
import modelsCommand from '@/commands/models';
import monthlyCommand from '@/commands/monthly';
import sessionCommand from '@/commands/session';
import sessionsCommand from '@/commands/sessions';
import weeklyCommand from '@/commands/weekly';

const main = define({
	name: 'ocusage',
	version: '0.1.0',
	description: 'OpenCode usage tracker - Track and analyze token usage',
	run: async () => {
		console.log('Usage: ocusage <command> [options]');
		console.log('');
		console.log('Commands:');
		console.log('  sessions    List all sessions');
		console.log('  session     Show session details');
		console.log('  models      Show usage by model');
		console.log('  daily       Show daily usage');
		console.log('  weekly      Show weekly usage');
		console.log('  monthly     Show monthly usage');
		console.log('');
		console.log('Run "ocusage <command> --help" for more information');
	},
});

await cli(Bun.argv.slice(2), main, {
	name: 'ocusage',
	version: '0.1.0',
	subCommands: {
		sessions: sessionsCommand,
		session: sessionCommand,
		models: modelsCommand,
		daily: dailyCommand,
		weekly: weeklyCommand,
		monthly: monthlyCommand,
	},
});
