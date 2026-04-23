import axios from 'axios';
import { Command } from 'commander';

const API_BASE = 'https://xtracker.polymarket.com/api';

export function makeXTrackerCommand(): Command {
  const xtracker = new Command('xtracker')
    .description('Access XTracker social media analytics for Polymarket (X, Truth Social)');

  xtracker.command('users')
    .description('Get all tracked users')
    .option('-p, --platform <platform>', 'Filter by platform: X or TRUTH_SOCIAL')
    .option('-s, --stats', 'Include detailed posting statistics')
    .option('-i, --include-inactive', 'Include users with no active trackings')
    .action(async (options) => {
      try {
        const { platform, stats, includeInactive } = options;
        const res = await axios.get(`${API_BASE}/users`, {
          params: { platform, stats, includeInactive }
        });
        console.log(JSON.stringify(res.data, null, 2));
      } catch (err: any) {
        console.error('Error fetching users:', err.response?.data || err.message);
      }
    });

  xtracker.command('user')
    .description('Get a specific user by handle')
    .argument('<handle>', 'User handle')
    .option('-p, --platform <platform>', 'Filter by platform: X or TRUTH_SOCIAL')
    .action(async (handle, options) => {
      try {
        const { platform } = options;
        const res = await axios.get(`${API_BASE}/users/${handle}`, {
          params: { platform }
        });
        console.log(JSON.stringify(res.data, null, 2));
      } catch (err: any) {
        console.error('Error fetching user:', err.response?.data || err.message);
      }
    });

  xtracker.command('metrics')
    .description('Get daily post counts and metrics for a user')
    .argument('<handle>', 'User handle')
    .option('-p, --platform <platform>', 'Filter by platform: X or TRUTH_SOCIAL')
    .option('--start-date <date>', 'Filter metrics after this date (ISO date)')
    .option('--end-date <date>', 'Filter metrics before this date (ISO date)')
    .option('-t, --type <type>', 'Metric type (default: daily)')
    .action(async (handle, options) => {
      try {
        const { platform, startDate, endDate, type } = options;
        
        // Get user ID first
        const userRes = await axios.get(`${API_BASE}/users/${handle}`, {
          params: { platform }
        });
        
        const userId = userRes.data?.data?.id;
        if (!userId) {
          throw new Error('User not found or ID missing in response');
        }

        // Fetch metrics instead of individual posts
        const metricsRes = await axios.get(`${API_BASE}/metrics/${userId}`, {
          params: { startDate, endDate, type }
        });
        
        console.log(JSON.stringify(metricsRes.data, null, 2));
      } catch (err: any) {
        console.error('Error fetching metrics:', err.response?.data || err.message);
      }
    });

  xtracker.command('trackings')
    .description('Get tracking periods')
    .argument('[handle]', 'Optional user handle to get trackings for a specific user')
    .option('-p, --platform <platform>', 'Filter by platform: X or TRUTH_SOCIAL')
    .option('--all', 'Include inactive trackings')
    .action(async (handle, options) => {
      try {
        const { platform, all } = options;
        const activeOnly = !all;
        const url = handle ? `${API_BASE}/users/${handle}/trackings` : `${API_BASE}/trackings`;
        const res = await axios.get(url, {
          params: { platform, activeOnly }
        });
        console.log(JSON.stringify(res.data, null, 2));
      } catch (err: any) {
        console.error('Error fetching trackings:', err.response?.data || err.message);
      }
    });

  xtracker.command('tracking')
    .description('Get a specific tracking period by ID')
    .argument('<id>', 'Tracking ID')
    .option('-s, --stats', 'Include computed statistics')
    .action(async (id, options) => {
      try {
        const { stats } = options;
        const res = await axios.get(`${API_BASE}/trackings/${id}`, {
          params: { includeStats: stats }
        });
        console.log(JSON.stringify(res.data, null, 2));
      } catch (err: any) {
        console.error('Error fetching tracking:', err.response?.data || err.message);
      }
    });

  return xtracker;
}
