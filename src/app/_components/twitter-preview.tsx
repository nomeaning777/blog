"use client";

import { useTwitterWidget } from "@/lib/twitter-widget";
import { useRef } from "react";

export interface TwitterPreviewProps {
	url: string;
}

export function TwitterPreview({ url }: TwitterPreviewProps) {
	const ref = useRef(null);
	useTwitterWidget(ref);

	return (
		<blockquote className="twitter-tweet" data-dnt="true" ref={ref}>
			<a
				href={`${url.replace("https://x.com", "https://twitter.com")}?ref_src=twsrc%5Etfw`}
			>
				{url}
			</a>
		</blockquote>
	);
}
