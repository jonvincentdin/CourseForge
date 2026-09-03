import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * react-markdown without rehype-raw never interprets embedded HTML as
 * markup — it's escaped and rendered as literal text instead. That's
 * the entire XSS defense here: no separate sanitizer library is
 * needed as long as this stays true. Do not add rehype-raw to this
 * component without adding a real sanitizer (e.g. rehype-sanitize)
 * alongside it (see .context/SECURITY.md).
 */
export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="max-w-none text-sm leading-relaxed text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1 className="mt-6 font-display text-xl font-medium text-ink first:mt-0" {...props} />
          ),
          h2: (props) => (
            <h2 className="mt-5 font-display text-lg font-medium text-ink" {...props} />
          ),
          h3: (props) => (
            <h3 className="mt-4 text-base font-semibold text-ink" {...props} />
          ),
          p: (props) => <p className="mt-3 first:mt-0" {...props} />,
          ul: (props) => <ul className="mt-3 list-disc space-y-1 pl-5" {...props} />,
          ol: (props) => <ol className="mt-3 list-decimal space-y-1 pl-5" {...props} />,
          li: (props) => <li {...props} />,
          blockquote: (props) => (
            <blockquote
              className="mt-3 border-l-2 border-ember pl-4 text-ink-soft"
              {...props}
            />
          ),
          a: (props) => (
            <a className="text-ember underline underline-offset-2" {...props} />
          ),
          code: (props) => (
            <code className="rounded bg-paper px-1 py-0.5 font-mono text-xs" {...props} />
          ),
          pre: (props) => (
            <pre
              className="mt-3 overflow-x-auto rounded-md border border-line bg-paper p-3 font-mono text-xs"
              {...props}
            />
          ),
          table: (props) => (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          th: (props) => (
            <th
              className="border border-line bg-paper px-2 py-1 text-left font-medium"
              {...props}
            />
          ),
          td: (props) => <td className="border border-line px-2 py-1" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
