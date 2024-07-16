import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import remarkMath from "remark-math";
import rehypeReact from "rehype-react";
import rehypeRaw from "rehype-raw";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { TwitterPreview } from "@/app/_components/twitter-preview";
import { Mermaid } from "@/app/_components/mermaid";
import type { ReactNode } from "react";

export default async function markdownToHtml(markdown: string) {
	const result = await unified()
		.use(remarkParse, {})
		.use(remarkGfm)
		.use(remarkMath)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeKatex)
		.use(rehypeHighlight, { plainText: ["mermaid"] })
		.use(rehypeRaw)
		.use(rehypeReact, {
			jsx,
			jsxs,
			Fragment,
			components: {
				"x-twitter-preview": TwitterPreview,
				code: (props: {
					className: string;
					children: ReactNode | ReactNode[] | undefined;
				}) => {
					if (props.className?.includes("language-mermaid")) {
						return <Mermaid {...props} />;
					}
					return <code {...props} />;
				},
			},
		} as unknown as boolean)
		.process(markdown);
	return result;
}
