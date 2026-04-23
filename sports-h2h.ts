import { Command } from 'commander';
import axios from 'axios';

export function makeSportsH2HCommand(): Command {
  return new Command('sports-h2h')
    .description('Compare two sports teams head-to-head.')
    .requiredOption('--sport <type>', 'The sport to compare (e.g., football, basketball, hockey, baseball, american-football)')
    .requiredOption('--team1 <name>', 'The first team name to search for (e.g., "Lakers")')
    .requiredOption('--team2 <name>', 'The second team name to search for (e.g., "Warriors")')
    .action(async (options) => {
      const apiKey = process.env.APISPORTS_API_KEY;
      if (!apiKey) {
        console.error('Error: APISPORTS_API_KEY environment variable is not set.');
        process.exit(1);
      }

      let sport = options.sport.toLowerCase();
      if (sport === 'soccer') sport = 'football';

      const isFootball = sport === 'football';
      const baseUrl = isFootball
        ? 'https://v3.football.api-sports.io'
        : `https://v1.${sport}.api-sports.io`;

      const headers = {
        'x-apisports-key': apiKey
      };

      try {
        const t1Res = await axios.get(`${baseUrl}/teams`, { headers, params: { search: options.team1 } });
        const t1Data = t1Res.data.response;
        if (!t1Data || t1Data.length === 0) {
          console.error(`Could not find team matching "${options.team1}"`);
          process.exit(1);
        }

        const t1 = t1Data[0];
        const t1Id = isFootball ? t1.team.id : t1.id;
        const t1Name = isFootball ? t1.team.name : t1.name;

        const t2Res = await axios.get(`${baseUrl}/teams`, { headers, params: { search: options.team2 } });
        const t2Data = t2Res.data.response;
        if (!t2Data || t2Data.length === 0) {
          console.error(`Could not find team matching "${options.team2}"`);
          process.exit(1);
        }

        const t2 = t2Data[0];
        const t2Id = isFootball ? t2.team.id : t2.id;
        const t2Name = isFootball ? t2.team.name : t2.name;

        let h2hUrl = '';
        let h2hParams: any = {};
        if (isFootball) {
          h2hUrl = `${baseUrl}/fixtures/headtohead`;
          h2hParams = { h2h: `${t1Id}-${t2Id}` };
        } else {
          h2hUrl = `${baseUrl}/games`;
          h2hParams = { h2h: `${t1Id}-${t2Id}` };
        }

        const h2hRes = await axios.get(h2hUrl, { headers, params: h2hParams });
        const matches = h2hRes.data.response;

        if (!matches || matches.length === 0) {
          console.log(`No historical H2H matches found between ${t1Name} and ${t2Name}.`);
          return;
        }

        const now = Date.now() / 1000;
        const pastMatches = matches.filter((m: any) => {
          const ts = isFootball ? m.fixture?.timestamp : m.timestamp;
          return ts < now;
        });

        // Sort upcoming matches by timestamp ascending (closest first)
        const upcomingMatches = matches.filter((m: any) => {
          const ts = isFootball ? m.fixture?.timestamp : m.timestamp;
          return ts >= now;
        }).sort((a: any, b: any) => {
          const tsA = isFootball ? a.fixture?.timestamp : a.timestamp;
          const tsB = isFootball ? b.fixture?.timestamp : b.timestamp;
          return tsA - tsB;
        });

        // Compute summary stats
        let team1Wins = 0;
        let team2Wins = 0;
        let draws = 0;
        let team1Goals = 0;
        let team2Goals = 0;

        pastMatches.forEach((m: any) => {
          const homeTeamId = isFootball ? m.teams?.home?.id : m.teams?.home?.id;
          const isTeam1Home = homeTeamId === t1Id;

          let homeGoals = m.goals?.home ?? m.scores?.home?.total ?? 0;
          let awayGoals = m.goals?.away ?? m.scores?.away?.total ?? 0;

          if (isTeam1Home) {
            team1Goals += homeGoals;
            team2Goals += awayGoals;
            if (homeGoals > awayGoals) team1Wins++;
            else if (homeGoals < awayGoals) team2Wins++;
            else draws++;
          } else {
            team1Goals += awayGoals;
            team2Goals += homeGoals;
            if (awayGoals > homeGoals) team1Wins++;
            else if (awayGoals < homeGoals) team2Wins++;
            else draws++;
          }
        });

        let nextMatch = upcomingMatches[0] || null;
        let odds = null;

        if (nextMatch) {
          const fixtureId = isFootball ? nextMatch.fixture?.id : nextMatch.id;
          const oddsUrl = `${baseUrl}/odds`;
          const oddsParams = isFootball ? { fixture: fixtureId } : { game: fixtureId };

          try {
            const oddsRes = await axios.get(oddsUrl, { headers, params: oddsParams });
            if (oddsRes.data.response && oddsRes.data.response.length > 0) {
              const allBookmakers = oddsRes.data.response[0].bookmakers;
              // Prefer Bet365, otherwise take the first available bookmaker
              const bookmaker = allBookmakers.find((b: any) => b.name === 'Bet365') || allBookmakers[0];

              if (bookmaker) {
                const allowedBetNames = [
                  'Match Winner', 'Moneyline', 'Home/Away',
                  'Goals Over/Under', 'Over/Under', 'Both Teams Score'
                ];

                const filteredBets = bookmaker.bets.filter((b: any) => allowedBetNames.includes(b.name));

                odds = {
                  bookmaker: bookmaker.name,
                  bets: filteredBets
                };
              }
            }
          } catch (e: any) {
            console.error("Could not fetch odds for the upcoming match:", e?.message);
          }
        }

        const output = {
          summary: {
            totalPastMatches: pastMatches.length,
            [t1Name]: { wins: team1Wins, goalsOrPointsScored: team1Goals },
            [t2Name]: { wins: team2Wins, goalsOrPointsScored: team2Goals },
            draws: draws
          },
          upcomingMatch: nextMatch ? {
            id: isFootball ? nextMatch.fixture?.id : nextMatch.id,
            date: isFootball ? nextMatch.fixture?.date : nextMatch.date,
            odds: odds
          } : null
        };

        // Output final result as JSON to stdout
        console.log(JSON.stringify(output, null, 2));

      } catch (error: any) {
        console.error('API Error:', error?.response?.data || error.message);
      }
    });
}
