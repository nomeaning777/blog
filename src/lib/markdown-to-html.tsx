import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import math from "remark-math";
import rehypeReact from "rehype-react";
import rehypeRaw from "rehype-raw";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { TwitterPreview } from "@/app/_components/twitter-preview";
import rehypeStringify from "rehype-stringify";

export default async function markdownToHtml(markdown: string) {
	const r2 = await unified()
		.use(remarkParse, {})
		.use(remarkGfm)
		.use(math)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeKatex)
		.use(rehypeHighlight)
		.use(rehypeStringify, { allowDangerousHtml: true })
		.process(markdown);
	console.log(r2);

	const result = await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(math)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeKatex)
		.use(rehypeHighlight)
		.use(rehypeRaw)
		.use(rehypeReact, {
			jsx,
			jsxs,
			Fragment,
			components: {
				"x-twitter-preview": TwitterPreview,
			},
		} as unknown as boolean)
		.process(markdown);
	console.log(result.result.props.children);

	return result;
}
