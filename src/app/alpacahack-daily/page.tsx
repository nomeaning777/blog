import Container from "@/app/_components/container";
import { getAllAlpacahackBside, getAllAlpacahackDaily } from "@/lib/api";
import Link from "next/link";

export default function AlpacahackDailyIndex() {
	const dailyPosts = getAllAlpacahackDaily();
	const bsidePosts = getAllAlpacahackBside();

	return (
		<main>
			<Container>
				<div className="max-w-2xl mx-auto">
					<h1 className="text-4xl font-bold tracking-tight mb-8">
						Alpacahack Daily Writeup
					</h1>
					{dailyPosts.length > 0 && (
						<section className="mb-12">
							<h2 className="text-2xl font-bold mt-8 mb-4">Daily</h2>
							<ul>
								{dailyPosts.map((post) => (
									<li key={post.slug}>
										<Link
											href={`/alpacahack-daily/${post.slug}`}
											className="text-blue-600 hover:underline"
										>
											<time dateTime={post.date}>{post.date}</time> --{" "}
											{post.title}
										</Link>
									</li>
								))}
							</ul>
						</section>
					)}
					<section className="mb-12">
						<h2 className="text-2xl font-bold mt-8 mb-4">B-Side</h2>
						{bsidePosts.length > 0 ? (
							<ul>
								{bsidePosts.map((post) => (
									<li key={post.slug}>
										<Link
											href={`/alpacahack-daily/bside/${post.slug}`}
											className="text-blue-600 hover:underline"
										>
											<time dateTime={post.month}>{post.month}</time> --{" "}
											{post.title}
										</Link>
									</li>
								))}
							</ul>
						) : (
							<p className="text-gray-600">No B-Side posts yet.</p>
						)}
					</section>
				</div>
			</Container>
		</main>
	);
}
