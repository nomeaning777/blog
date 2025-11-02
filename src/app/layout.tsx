import Footer from "@/app/_components/footer";
import type { Metadata } from "next";
import "katex/dist/katex.css";
import "highlight.js/styles/default.css";
import "github-markdown-css/github-markdown-light.css";

import "./globals.css";
import Header from "./_components/header";
import Script from "next/script";
import { TwitterWidgetProvider } from "./_components/twitter-widget-provider";

export const metadata: Metadata = {
	title: "nomeaning blog",
	description: "雑多なメモ",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ja">
			<head>
				<meta name="theme-color" content="#000" />
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&family=Inter:wght@100..900&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body
				style={{
					fontFamily: 'Inter, "BIZ UDPGothic", sans-serif',
				}}
			>
				<TwitterWidgetProvider>
					<Header />
					<div className="min-h-screen">{children}</div>
					<Footer />
				</TwitterWidgetProvider>
			</body>
		</html>
	);
}
