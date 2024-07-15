"use client";

import { type TwitterWidget, TwitterWidgetContext } from "@/lib/twitter-widget";
import Script from "next/script";
import { useState, type ReactNode } from "react";

declare global {
	interface Window {
		twttr?: {
			widgets: TwitterWidget;
		};
	}
}

type Props = {
	children?: ReactNode;
};

export function TwitterWidgetProvider({ children }: Props) {
	const [widget, setWidget] = useState<TwitterWidget | null>(null);
	return (
		<>
			<TwitterWidgetContext.Provider value={widget}>
				{children}
			</TwitterWidgetContext.Provider>
			<Script
				strategy="lazyOnload"
				onLoad={() => {
					if (window.twttr) {
						setWidget(window.twttr.widgets);
					}
				}}
				src="https://platform.twitter.com/widgets.js"
			/>
		</>
	);
}
