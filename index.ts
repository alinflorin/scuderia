#!/usr/bin/env node
import 'dotenv/config';

import { Command } from 'commander';
import { makeSmartAnalysisCommand } from './smart-analysis.js';
import { makeCryptoCoinIndicatorsCommand } from './crypto-coin-indicators.js';
import { makeSearchRedditWithCommentsCommand } from './search-reddit-with-comments.js';
import { makeWaitCommand } from './wait.js';
import { makeWeatherForecastCommand } from './weather-forecast.js';
import { makeSportsH2HCommand } from './sports-h2h.js';

const program = new Command();

program
  .name('./utils.sh')
  .description('Utils for trading')
  .version('1.0.0');

program.addCommand(makeSmartAnalysisCommand());
program.addCommand(makeCryptoCoinIndicatorsCommand());
program.addCommand(makeSearchRedditWithCommentsCommand());
program.addCommand(makeWeatherForecastCommand());
program.addCommand(makeWaitCommand());
program.addCommand(makeSportsH2HCommand());

program
  .command('help-all')
  .description('Show help for all commands')
  .action(() => {
    console.log(program.helpInformation());
    for (const cmd of program.commands) {
      if (cmd.name() === 'help-all') continue;
      console.log('\n' + '─'.repeat(60));
      console.log(cmd.helpInformation());
    }
  });

program.parse();