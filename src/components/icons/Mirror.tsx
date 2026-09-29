import type { SVGProps } from "react";

/**
 * Lucide'da hazır bir "ayna" ikonu olmadığı için, aynı görsel dile (24x24,
 * stroke=currentColor, 1.75px, yuvarlak uç/köşe) uygun elle çizilmiş bir ikon.
 */
export function Mirror(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <ellipse cx="12" cy="9.5" rx="5.5" ry="6.5" />
      <path d="M12 16v5" />
      <path d="M9 21h6" />
    </svg>
  );
}
