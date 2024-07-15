import DateFormatter from "./date-formatter";
import { PostTitle } from "@/app/_components/post-title";

type Props = {
	title: string;
	date: string;
};

export function PostHeader({ title, date }: Props) {
	return (
		<div className="mb-6 pb-6 border-b border-gray-300">
			<PostTitle>{title}</PostTitle>
			<DateFormatter dateString={date} />
		</div>
	);
}
