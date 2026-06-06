import Link from "next/link";

const Header = () => {
	return (
		<header className="text-xl tracking-tight leading-tight w-100 pl-4 pb-4 mb-12 pt-4 bg-gray-100">
			<nav className="flex flex-wrap gap-x-4 gap-y-2">
				<Link href="/" className="hover:underline">
					Blog
				</Link>
				<Link href="/alpacahack-daily/" className="hover:underline">
					Alpacahack Daily
				</Link>
			</nav>
		</header>
	);
};

export default Header;
