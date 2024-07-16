"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import mermaid from "mermaid";

export interface MermaidProps {
	children: React.ReactNode[] | React.ReactNode | undefined;
}

export function Mermaid({ children }: MermaidProps) {
	const ref = useRef(null);
	useEffect(() => {
		if (ref?.current) {
			mermaid.run({
				nodes: [ref.current],
			});
		}
	}, []);
	return <code ref={ref}>{children}</code>;
}
