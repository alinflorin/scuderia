import axios from 'axios';
import { Command } from 'commander';

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
  baseUrl: string,
  userAgent: string,
  query: string,
  limit: number,
): Promise<RedditPost[]> {
  const params = new URLSearchParams({
    q: query,
    sort: 'relevance',
    limit: String(limit),
    type: 'link',
  });
  const res = await axios.get<RedditSearchResponse>(`${baseUrl}/search.json?${params}`, {
    headers: { 'User-Agent': userAgent },
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
  baseUrl: string,
  userAgent: string,
  post: RedditPost,
  limit: number,
): Promise<RedditComment[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  let body: RedditCommentsResponse;
  try {
    const res = await axios.get<RedditCommentsResponse>(
      `${baseUrl}/r/${post.subreddit}/comments/${post.id}.json?${params}`,
      { headers: { 'User-Agent': userAgent }, timeout: 15000 },
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
      const redditApiBase = `https://www.reddit.com`;
      const redditUserAgent = `scuderia/1.0`;
      const limitPosts = parseInt(options.limitPosts, 10);
      const limitComments = parseInt(options.limitComments, 10);

      const posts = await searchPosts(redditApiBase, redditUserAgent, query, limitPosts);
      if (posts.length === 0) {
        console.log(JSON.stringify([], null, 2));
        return;
      }

      const commentsPerPost = await Promise.all(
        posts.map(p => fetchComments(redditApiBase, redditUserAgent, p, limitComments)),
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