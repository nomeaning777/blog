import type { Post } from "@/interfaces/post";
import type {
	AlpacahackBsidePost,
	AlpacahackDailyPost,
} from "@/interfaces/alpacahack";
import fs from "node:fs";
import matter from "gray-matter";
import { join } from "node:path";
import { parse, stringify } from "yaml";

const postsDirectory = join(process.cwd(), "_posts");
const alpacahackDailyDirectory = join(process.cwd(), "alpacahack-daily");
const alpacahackBsideDirectory = join(process.cwd(), "alpacahack-daily-bside");

function getMarkdownSlugs(directory: string) {
	if (!fs.existsSync(directory)) {
		return [];
	}

	return fs.readdirSync(directory).filter((slug) => slug.endsWith(".md"));
}

function readMarkdownFile(directory: string, slug: string) {
	const realSlug = slug.replace(/\.md$/, "");
	const fullPath = join(directory, `${realSlug}.md`);

	if (!fs.existsSync(fullPath)) {
		return null;
	}

	const fileContents = fs.readFileSync(fullPath, "utf8");
	const { data, content } = matter(fileContents, {
		engines: {
			yaml: {
				parse,
				stringify,
			},
		},
	});

	return { data, content, realSlug };
}

export function getPostSlugs() {
	return fs.readdirSync(postsDirectory);
}

export function getPostBySlug(slug: string) {
	const realSlug = slug.replace(/\.md$/, "");
	const fullPath = join(postsDirectory, `${realSlug}.md`);
	const fileContents = fs.readFileSync(fullPath, "utf8");
	const { data, content } = matter(fileContents, {
		engines: {
			yaml: {
				parse,
				stringify,
			},
		},
	});

	return { ...data, slug: realSlug, content } as Post;
}

export function getAllPosts(): Post[] {
	const slugs = getPostSlugs();
	const posts = slugs
		.map((slug) => getPostBySlug(slug))
		// sort posts by date in descending order
		.sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
	return posts;
}

export function getAlpacahackDailySlugs() {
	return getMarkdownSlugs(alpacahackDailyDirectory);
}

export function getAlpacahackDailyBySlug(
	slug: string,
): AlpacahackDailyPost | null {
	const markdown = readMarkdownFile(alpacahackDailyDirectory, slug);

	if (!markdown) {
		return null;
	}

	return {
		slug: markdown.realSlug,
		title: markdown.data.title,
		date: markdown.realSlug.slice(0, 10),
		content: markdown.content,
	};
}

export function getAllAlpacahackDaily(): AlpacahackDailyPost[] {
	return getAlpacahackDailySlugs()
		.map((slug) => getAlpacahackDailyBySlug(slug))
		.filter((post): post is AlpacahackDailyPost => post !== null)
		.sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
}

export function getAlpacahackBsideSlugs() {
	return getMarkdownSlugs(alpacahackBsideDirectory);
}

export function getAlpacahackBsideBySlug(
	slug: string,
): AlpacahackBsidePost | null {
	const markdown = readMarkdownFile(alpacahackBsideDirectory, slug);

	if (!markdown) {
		return null;
	}

	return {
		slug: markdown.realSlug,
		title: markdown.data.title,
		month: markdown.realSlug.slice(0, 7),
		content: markdown.content,
	};
}

export function getAllAlpacahackBside(): AlpacahackBsidePost[] {
	return getAlpacahackBsideSlugs()
		.map((slug) => getAlpacahackBsideBySlug(slug))
		.filter((post): post is AlpacahackBsidePost => post !== null)
		.sort((post1, post2) => (post1.month > post2.month ? -1 : 1));
}
