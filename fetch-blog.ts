import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import fs from "node:fs/promises";
import type { ListBlockChildrenResponseResult } from "notion-to-md/build/types";
import { URL } from "node:url";
import path from "node:path";
import { parseISO } from "date-fns";
import type { PathLike } from "node:fs";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import type { Post } from "@/interfaces/post";
import removeMarkdown from "remove-markdown";
import { getAllPosts } from "@/lib/api";
import yaml from "yaml";
import { Feed, type FeedOptions } from "feed";

const SITE_URL = "https://blog.hoge.cc";

const rssFeedOptions: FeedOptions = {
	title: "nomeaning blog",
	id: SITE_URL,
	link: SITE_URL,
	language: "ja",
	copyright: "Copyright (c) 2024 nomeaning",
};

// check if the file exists
async function canAccess(path: PathLike): Promise<boolean> {
	try {
		await fs.access(path);
		return true;
	} catch {
		return false;
	}
}

// save the remote file to the public directory
async function saveUrlToPublicDirectory(
	slug: string,
	urlString: string,
): Promise<string> {
	const uuidRegex = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/;
	const url = new URL(urlString);
	const pathComponents = url.pathname.split("/");
	if (pathComponents.length !== 4) {
		throw new Error("unexpected path");
	}
	if (!pathComponents[2].match(uuidRegex)) {
		throw new Error("unexpected path");
	}

	const ext = pathComponents[3]
		.split(".")
		.filter((a) => a !== "")
		.slice(1)
		.join(".");
	const filename = `${pathComponents[2]}.${ext}`;
	const directory = path.join("public", "assets", "post", slug);
	await fs.mkdir(directory, { recursive: true });
	const filePath = path.join(directory, filename);

	if (!(await canAccess(filePath))) {
		const res = await fetch(urlString);
		if (!res.ok) {
			throw new Error(`failed to fetch ${urlString}`);
		}
		const buffer = Buffer.from(await res.arrayBuffer());
		await fs.writeFile(filePath, buffer);
	}

	return `/assets/post/${slug}/${filename}`;
}

function imageTransformer(
	slug: string,
): (block: ListBlockChildrenResponseResult) => Promise<string | false> {
	return async (block: ListBlockChildrenResponseResult) => {
		if (!("type" in block) || block.type !== "image") {
			return false;
		}
		const blockContent = block.image;
		let imageTitle = "";
		const imageCaption = blockContent.caption
			.map((item) => item.plain_text)
			.join("");
		if (blockContent.type === "external") {
			return false;
		}
		if (imageCaption.trim() !== "") {
			imageTitle = imageCaption;
		} else {
			const matches = blockContent.file.url.match(
				/[^\/\\&\?]+\.\w{3,4}(?=([\?&].*$|$))/,
			);
			imageTitle = matches ? matches[0] : "image";
		}

		return `![${imageTitle}](${await saveUrlToPublicDirectory(
			slug,
			blockContent.file.url,
		)})`;
	};
}
function fileTransformer(
	slug: string,
): (block: ListBlockChildrenResponseResult) => Promise<string | false> {
	return async (block: ListBlockChildrenResponseResult) => {
		if (!("type" in block) || block.type !== "file") {
			return false;
		}
		const blockContent = block.file;
		let title =
			blockContent?.caption.map((item) => item.plain_text).join("") || "file";
		if (blockContent.type !== "file") {
			return false;
		}
		const link = blockContent.file.url;
		if ((!title || title.trim().length === 0) && link) {
			const matches = link.match(/[^\/\\&\?]+\.\w{3,4}(?=([\?&].*$|$))/);
			title = matches ? matches[0] : "file";
		}
		return `[${title}](${await saveUrlToPublicDirectory(slug, link)})`;
	};
}

function extractTextFromProp(
	properties: PageObjectResponse["properties"],
	key: string,
): string {
	if (!properties[key]) {
		return "";
	}
	const prop = properties[key];
	if (prop.type === "title") {
		return prop.title.map((item) => item.plain_text).join("");
	}
	if (prop.type === "rich_text") {
		return prop.rich_text.map((item) => item.plain_text).join("");
	}

	throw new Error("unsupported prop type");
}

const notion = new Client({
	auth: process.env.NOTION_TOKEN,
});

// passing notion client to the option
const n2m = new NotionToMarkdown({ notionClient: notion, config: {} });
n2m.setCustomTransformer("embed", async (block) => {
	if (!("type" in block)) {
		return false;
	}
	if (block.type !== "embed") {
		return false;
	}
	if (!block.embed.url.startsWith("https://x.com")) {
		return false;
	}
	return `<div><x-twitter-preview url="${block.embed.url}"></x-twitter-preview></div>`;
});

const databaseId = process.env.NOTION_DATABASE;
if (!databaseId) {
	throw new Error("NOTION_DATABASE env variable is not set");
}
(async () => {
	const pages = await notion.databases.query({ database_id: databaseId });
	if (pages.next_cursor) {
		throw new Error("paging is not supported yet");
	}
	for (const page of pages.results) {
		if (page.object === "page" && "properties" in page) {
			const slug = extractTextFromProp(page.properties, "slug");
			if (!slug) {
				throw new Error("slug is empty");
			}
			if (slug === "ignore") {
				continue;
			}
			const title = extractTextFromProp(page.properties, "Title");
			const dateProp = page.properties.日付;
			if (dateProp.type !== "date") {
				throw new Error("unexpected date type");
			}
			if (!dateProp.date) {
				throw new Error("date is empty");
			}
			const date = dateProp.date.start;

			n2m.setCustomTransformer("file", fileTransformer(slug));
			n2m.setCustomTransformer("image", imageTransformer(slug));

			const mdBlocks = await n2m.pageToMarkdown(page.id);
			const mdString = n2m.toMarkdownString(mdBlocks);

			const postMeta: Omit<Post, "content"> = {
				date,
				slug,
				title,
			};

			const fileContent = `---
${yaml.stringify(postMeta)}
---
${mdString.parent}`;

			const filePath = path.join("_posts", `${slug}.md`);
			await fs.writeFile(filePath, fileContent, { encoding: "utf-8" });
		} else {
			throw new Error("unsupported object type");
		}
	}

	const posts: Post[] = getAllPosts();

	const feed = new Feed(rssFeedOptions);

	for (const post of posts) {
		feed.addItem({
			title: post.title,
			description: removeMarkdown((post.content || "").substring(0, 500)),
			link: `${SITE_URL}/posts/${post.slug}`,
			id: `${SITE_URL}/posts/${post.slug}`,
			date: parseISO(post.date),
		});
	}

	await fs.writeFile("public/rss.xml", feed.rss2(), { encoding: "utf-8" });
})();
