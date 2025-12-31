import { cli, define } from 'gunshi';

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
		console.log('  export      Export data to CSV/JSON');
		console.log('  live        Real-time monitoring');
		console.log('');
		console.log('Run "ocusage <command> --help" for more information');
	},
});

await cli(process.argv.slice(2), main, {
	name: 'ocusage',
	version: '0.1.0',
});
