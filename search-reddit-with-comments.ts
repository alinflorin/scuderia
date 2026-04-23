import axios from 'axios';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

const TOKEN_CACHE_PATH = path.resolve('./reddit_token');

interface TokenCache {
  access_token: string;
  expires_at: number;
}

interface RedditAuth {
  baseUrl: string;
  headers: Record<string, string>;
}

function readCachedToken(): TokenCache | null {
  try {
    const raw = fs.readFileSync(TOKEN_CACHE_PATH, 'utf-8');
    const cached = JSON.parse(raw) as TokenCache;
    if (Date.now() < cached.expires_at) return cached;
  } catch {
    // missing or invalid cache
  }
  return null;
}

function writeCachedToken(token: TokenCache): void {
  fs.mkdirSync(path.dirname(TOKEN_CACHE_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(token), 'utf-8');
}

async function getAuth(): Promise<RedditAuth> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = `scuderia/1.0`;

  if (!clientId || !clientSecret) {
    return { baseUrl: 'https://www.reddit.com', headers: { 'User-Agent': userAgent } };
  }

  const cached = readCachedToken();
  const accessToken = cached
    ? cached.access_token
    : await (async () => {
        const res = await axios.post<{ access_token: string; expires_in: number }>(
          'https://www.reddit.com/api/v1/access_token',
          'grant_type=client_credentials',
          {
            auth: { username: clientId, password: clientSecret },
            headers: {
              'User-Agent': userAgent,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 15000,
          },
        );
        writeCachedToken({
          access_token: res.data.access_token,
          expires_at: Date.now() + res.data.expires_in * 1000 - 60_000,
        });
        return res.data.access_token;
      })();

  return {
    baseUrl: 'https://oauth.reddit.com',
    headers: { 'User-Agent': userAgent, Authorization: `Bearer ${accessToken}` },
  };
}

interface RedditPost {
  id: string;
  subreddit: string;
  title: string;
  selftext: string;
}

interface RedditComment {
  score: number;
  text: string;
  postId: string;
}

interface PostWithComments {
  id: string;
  subreddit: string;
  title: string;
  text: string;
  comments: RedditComment[];
}

interface RedditSearchResponse {
  data: {
    children: Array<{ data: Record<string, unknown> }>;
  };
}

type RedditCommentsResponse = [
  { data: { children: unknown[] } },
  { data: { children: Array<{ data: Record<string, unknown> }> } },
];

async function searchPosts(
  auth: RedditAuth,
  query: string,
  limit: number,
): Promise<RedditPost[]> {
  const params = new URLSearchParams({
    q: query,
    sort: 'relevance',
    limit: String(limit),
    type: 'link',
  });
  const res = await axios.get<RedditSearchResponse>(`${auth.baseUrl}/search.json?${params}`, {
    headers: auth.headers,
    timeout: 15000,
  });
  const body = res.data;
  return body.data.children.map(c => ({
    id: String(c.data.id ?? ''),
    subreddit: String(c.data.subreddit ?? ''),
    title: String(c.data.title ?? ''),
    selftext: String(c.data.selftext ?? ''),
  }));
}

async function fetchComments(
  auth: RedditAuth,
  post: RedditPost,
  limit: number,
): Promise<RedditComment[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  let body: RedditCommentsResponse;
  try {
    const res = await axios.get<RedditCommentsResponse>(
      `${auth.baseUrl}/r/${post.subreddit}/comments/${post.id}.json?${params}`,
      { headers: auth.headers, timeout: 15000 },
    );
    body = res.data;
  } catch {
    return [];
  }
  const commentChildren = body[1]?.data?.children ?? [];
  return commentChildren
    .filter(c => c.data.body)
    .map(c => ({
      score: Number(c.data.score ?? 0),
      text: String(c.data.body ?? ''),
      postId: post.id,
    }));
}

export function makeSearchRedditWithCommentsCommand(): Command {
  return new Command('search-reddit-with-comments')
    .description(
      'Search Reddit for posts matching a query and return each post with its top comments.',
    )
    .argument('<query>', 'Search query')
    .option('-p, --limit-posts <number>', 'Max number of posts to return', '10')
    .option('-c, --limit-comments <number>', 'Max number of comments per post', '10')
    .action(async (query: string, options) => {
      const auth = await getAuth();
      const limitPosts = parseInt(options.limitPosts, 10);
      const limitComments = parseInt(options.limitComments, 10);

      const posts = await searchPosts(auth, query, limitPosts);
      if (posts.length === 0) {
        console.log(JSON.stringify([], null, 2));
        return;
      }

      const commentsPerPost = await Promise.all(
        posts.map(p => fetchComments(auth, p, limitComments)),
      );

      const result: PostWithComments[] = posts.map((post, i) => ({
        id: post.id,
        subreddit: post.subreddit,
        title: post.title,
        text: post.selftext,
        comments: commentsPerPost[i],
      }));

      console.log(JSON.stringify(result, null, 2));
    });
}