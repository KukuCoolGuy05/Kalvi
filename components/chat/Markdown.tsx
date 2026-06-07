"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Markdown — renders the tutor's replies with consistent, accessible styling.
 *
 * The model is instructed to reply in clean Markdown (headings, bold, lists,
 * tables, code, and the occasional image). We render that here so formatting is
 * uniform across every reply instead of leaking raw `**asterisks**` and `##`.
 *
 * Styling notes:
 *  - Spacing/line-height tuned for readability (matters for dyslexia/ADHD).
 *  - Inherits the bubble's color via `currentColor`, so it works in both the
 *    light theme and the high-contrast theme without overrides.
 *  - Links open in a new tab with rel=noopener; images are lazy + responsive.
 */
function MarkdownImpl({ content }: { content: string }) {
  return (
    <div className="space-y-3 leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="mt-4 text-base font-bold">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="mt-4 text-base font-bold">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="mt-3 text-sm font-semibold">{children}</h4>
          ),
          p: ({ children }) => <p className="break-words">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="ml-5 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="ml-5 list-decimal space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === "string" ? src : ""}
              alt={alt ?? ""}
              loading="lazy"
              className="my-2 max-h-80 w-auto max-w-full rounded-xl border border-border"
            />
          ),
          code: ({ className, children }) => {
            const block = (className ?? "").includes("language-");
            if (block) {
              return (
                <code className="block overflow-x-auto rounded-lg bg-black/10 p-3 font-mono text-[0.85em]">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-2">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border px-2 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-2 py-1">{children}</td>
          ),
          hr: () => <hr className="border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl);
