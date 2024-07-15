import Footer from "@/app/_components/footer";
import type { Metadata } from "next";
import { Inter, BIZ_UDPGothic } from "next/font/google";
import clsx from "clsx";
import "katex/dist/katex.css";
import "highlight.js/styles/default.css";
import "github-markdown-css/github-markdown-light.css";

import "./globals.css";
import Header from "./_components/header";
import { bizUdpGothic, inter } from "@/lib/fonts";
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
			</head>
			<body
				style={{
					...bizUdpGothic.style,
					fontFamily: `${inter.style.fontFamily},${bizUdpGothic.style.fontFamily}`,
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
