"use client";

import { useTwitterWidget } from "@/lib/twitter-widget";
import { useRef } from "react";

type Props = {
	content: string;
};

export function PostBody({ content }: Props) {
	const contentRef = useRef<HTMLDivElement | null>(null);
	useTwitterWidget(contentRef);
	return (
		<div className="max-w-2xl mx-auto">
			<div
				className={"markdown-body"}
				// biome-ignore lint: lint/security/noDangerouslySetInnerHtml
				dangerouslySetInnerHTML={{ __html: content }}
				suppressHydrationWarning
				ref={contentRef}
			/>
		</div>
	);
}
