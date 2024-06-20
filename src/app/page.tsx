import { getAllPosts } from "@/lib/api";
import Link from "next/link";
import Container from "./_components/container";
import { format, parseISO } from "date-fns";
import type { Post } from "../interfaces/post";
type GroupedPosts = { year: number; posts: Post[] }[];

function grouping(posts: Post[]): GroupedPosts {
	const ret: GroupedPosts = [];
	for (let i = 0; i < posts.length; i += 1) {
		const post = posts[i];
		const date = parseISO(post.date);
		if (ret.length > 0 && ret[ret.length - 1].year === date.getFullYear()) {
			ret[ret.length - 1].posts.push(post);
		} else {
			ret.push({
				year: date.getFullYear(),
				posts: [post],
			});
		}
	}
	return ret;
}

export default function Index() {
	const allPosts = grouping(getAllPosts());
	return (
		<main>
			<Container>
				{allPosts.map((year) => (
					<div key={year.year}>
						<h2 className="text-3xl mt-8 mb-4 leading-snug">
							{year.year}
						</h2>
						<ul>
						{year.posts.map((post) => (
							<li key={post.slug}>
								<Link href={`/post/${post.slug}`} className="text-blue-600 hover:underline">
									<time dateTime={format(parseISO(post.date), "yyyy-MM-dd")}>{format(parseISO(post.date), "yyyy-MM-dd")}</time> -- {post.title}
								</Link>
							</li>
						))}
						</ul>
					</div>
				))}
			</Container>
		</main>
	);
}
