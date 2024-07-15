import Link from "next/link";

const Header = () => {
	return (
		<h2 className="text-xl tracking-tight leading-tight w-100 pl-4 pb-4 mb-12 pt-4 bg-gray-100">
			<Link href="/" className="hover:underline">
				nomeaning blog
			</Link>
			.
		</h2>
	);
};

export default Header;
