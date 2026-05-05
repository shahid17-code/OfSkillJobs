// lib/blog.ts
import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data', 'blog.json');

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  description: string;
  readingTime: string;
  category?: string;
  htmlContent: string;
};

export function getAllPosts(): BlogPost[] {
  try {
    const jsonData = fs.readFileSync(dataPath, 'utf8');
    const { posts } = JSON.parse(jsonData) as { posts: BlogPost[] };
    return posts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (err) {
    console.error('[blog] Failed to read blog.json:', err);
    return [];
  }
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  const posts = getAllPosts();
  return posts.find((post) => post.slug === slug);
}