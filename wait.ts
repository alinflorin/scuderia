import { Command } from 'commander';

export function makeWaitCommand(): Command {
  return new Command('wait')
    .description('Wait for a specified number of seconds before exiting.')
    .argument('<seconds>', 'Number of seconds to wait')
    .action(async (seconds: string) => {
      const ms = parseFloat(seconds) * 1000;
      await new Promise(resolve => setTimeout(resolve, ms));
    });
}