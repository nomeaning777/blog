import Container from "@/app/_components/container";
import { PostTitle } from "@/app/_components/post-title";
import { getAllAlpacahackBside, getAlpacahackBsideBySlug } from "@/lib/api";
import markdownToHtml from "@/lib/markdown-to-html";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params = {
	params: Promise<{
		slug: string;
	}>;
};

export const dynamicParams = false;

export default async function AlpacahackBsidePost({ params }: Params) {
	const { slug } = await params;
	const post = getAlpacahackBsideBySlug(slug);

	if (!post) {
		return notFound();
	}

	const content = await markdownToHtml(post.content || "");

	return (
		<main>
			<Container>
				<article className="mb-32 max-w-2xl mx-auto">
					<div className="mb-6 pb-6 border-b border-gray-300">
						<PostTitle>{post.title}</PostTitle>
						<time dateTime={post.month}>{post.month}</time>
					</div>
					<div className="max-w-2xl mx-auto">
						<div className="markdown-body">{content.result}</div>
					</div>
				</article>
			</Container>
		</main>
	);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const { slug } = await params;
	const post = getAlpacahackBsideBySlug(slug);

	if (!post) {
		return notFound();
	}

	return {
		title: post.title,
	};
}

export async function generateStaticParams() {
	const params = getAllAlpacahackBside().map((post) => ({
		slug: post.slug,
	}));

	// Next static export rejects empty generateStaticParams for dynamic routes.
	return params.length > 0 ? params : [{ slug: "__placeholder__" }];
}
