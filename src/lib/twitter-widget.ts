import { createContext, useContext, useEffect } from "react";
export interface TwitterWidget {
	load(element?: HTMLElement): void;
}

export const TwitterWidgetContext = createContext<TwitterWidget | null>(null);

export function useTwitterWidget(elementRef?: React.RefObject<HTMLElement>) {
	const widget = useContext(TwitterWidgetContext);
	useEffect(() => {
		if (widget) {
			if (elementRef) {
				if (elementRef.current) {
					widget.load(elementRef?.current);
				}
			} else {
				widget.load();
			}
		}
	}, [widget, elementRef]);
}
