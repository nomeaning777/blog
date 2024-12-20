import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/api";
import { CMS_NAME } from "@/lib/constants";
import markdownToHtml from "@/lib/markdown-to-html";
import Container from "@/app/_components/container";
import Header from "@/app/_components/header";
import { PostBody } from "@/app/_components/post-body";
import { PostHeader } from "@/app/_components/post-header";
import { useEffect } from "react";
import { TwitterPreview } from "@/app/_components/twitter-preview";

export default async function Post({ params }: Params) {
	const post = getPostBySlug(params.slug);

	if (!post) {
		return notFound();
	}

	const content = await markdownToHtml(post.content || "");

	return (
		<main>
			<Container>
				<article className="mb-32 max-w-2xl mx-auto">
					<PostHeader title={post.title} date={post.date} />
					<div className="max-w-2xl mx-auto">
						<div className={"markdown-body"}>{content.result}</div>
					</div>
				</article>
			</Container>
		</main>
	);
}

type Params = {
	params: {
		slug: string;
	};
};

export function generateMetadata({ params }: Params): Metadata {
	const post = getPostBySlug(params.slug);

	if (!post) {
		return notFound();
	}

	const title = `${post.title}`;

	return {
		title,
	};
}

export async function generateStaticParams() {
	const posts = getAllPosts();

	return posts.map((post) => ({
		slug: post.slug,
	}));
}
