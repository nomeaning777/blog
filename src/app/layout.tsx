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
		<html lang="en">
			<head>
				<link
					rel="apple-touch-icon"
					sizes="180x180"
					href="/favicon/apple-touch-icon.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="32x32"
					href="/favicon/favicon-32x32.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="16x16"
					href="/favicon/favicon-16x16.png"
				/>
				<link rel="manifest" href="/favicon/site.webmanifest" />
				<link
					rel="mask-icon"
					href="/favicon/safari-pinned-tab.svg"
					color="#000000"
				/>
				<link rel="shortcut icon" href="/favicon/favicon.ico" />
				<meta name="msapplication-TileColor" content="#000000" />
				<meta
					name="msapplication-config"
					content="/favicon/browserconfig.xml"
				/>
				<meta name="theme-color" content="#000" />
				<link rel="alternate" type="application/rss+xml" href="/feed.xml" />
			</head>
			<body
				style={{
					...bizUdpGothic.style,
					fontFamily: `${inter.style.fontFamily},${bizUdpGothic.style.fontFamily}`,
				}}
			>
				<Header />
				<div className="min-h-screen">{children}</div>
				<Footer />
				<script async src="https://platform.twitter.com/widgets.js" />
			</body>
		</html>
	);
}
