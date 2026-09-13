/* Minimal, dependency-free Markdown → React §. The output is built from
   plain text tokens only (no dangerouslySetInnerHTML), so untrusted repo
   README content can never inject raw HTML. */

const INLINE_RE =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;

const isSafeUrl = (url = "") => {
    if (!url) return false;
    if (url.startsWith("#") || url.startsWith("/")) return true;
    try {
        const parsed = new URL(url, "https://commithub.local");
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
};

const renderInline = (text, keyBase) => {
    let lastIndex = 0;
    const nodes = [];
    let match;
    let counter = 0;

    while ((match = INLINE_RE.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }

        const token = match[0];

        if (token.startsWith("`") && token.endsWith("`")) {
            nodes.push(
                <code key={`${keyBase}-c${counter}`}>{token.slice(1, -1)}</code>
            );
        } else if (token.startsWith("**")) {
            nodes.push(
                <strong key={`${keyBase}-b${counter}`}>
                    {token.slice(2, -2)}
                </strong>
            );
        } else if (token.startsWith("*")) {
            nodes.push(
                <em key={`${keyBase}-i${counter}`}>{token.slice(1, -1)}</em>
            );
        } else {
            const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch && isSafeUrl(linkMatch[2])) {
                nodes.push(
                    <a
                        key={`${keyBase}-l${counter}`}
                        href={linkMatch[2]}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {renderInline(linkMatch[1], `${keyBase}-l${counter}`)}
                    </a>
                );
            } else {
                nodes.push(token);
            }
        }

        lastIndex = match.index + token.length;
        counter += 1;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes;
};

const readCodeFence = (lines, startIndex) => {
    const collected = [];

    for (let i = startIndex + 1; i < lines.length; i += 1) {
        if (lines[i].startsWith("```")) {
            return { block: collected.join("\n"), nextIndex: i + 1 };
        }
        collected.push(lines[i]);
    }

    return { block: collected.join("\n"), nextIndex: lines.length };
};

const isListMarker = (line) => /^(\s*)([-*•]|\d+\.)\s+/.test(line);

export const renderMarkdown = (content) => {
    if (!content || typeof content !== "string") {
        return null;
    }

    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const blocks = [];
    let paragraph = [];
    let list = null;
    let quote = [];

    const flushParagraph = () => {
        if (paragraph.length === 0) return;
        blocks.push({
            type: "p",
            text: paragraph.join(" ")
        });
        paragraph = [];
    };

    const flushList = () => {
        if (list) {
            blocks.push(list);
            list = null;
        }
    };

    const flushQuote = () => {
        if (quote.length > 0) {
            blocks.push({ type: "quote", text: quote.join(" ") });
            quote = [];
        }
    };

    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (line.startsWith("```")) {
            flushParagraph();
            flushList();
            flushQuote();
            const { block, nextIndex } = readCodeFence(lines, i);
            blocks.push({ type: "code", code: block });
            i = nextIndex;
            continue;
        }

        if (line.trim() === "---") {
            flushParagraph();
            flushList();
            flushQuote();
            blocks.push({ type: "hr" });
            i += 1;
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
            flushParagraph();
            flushList();
            flushQuote();
            blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
            i += 1;
            continue;
        }

        if (line.trim() === "") {
            flushParagraph();
            flushList();
            flushQuote();
            i += 1;
            continue;
        }

        if (line.startsWith(">")) {
            flushParagraph();
            flushList();
            quote.push(line.replace(/^>\s?/, ""));
            i += 1;
            continue;
        }

        if (isListMarker(line)) {
            flushParagraph();
            flushQuote();
            const marker = line.match(/^\s*(\d+\.|[-*•])\s+/)[1];
            const style = /^\d+\.$/.test(marker.trim()) ? "ol" : "ul";

            if (!list || list.style !== style) {
                flushList();
                list = { type: "list", style, items: [] };
            }

            const text = line.replace(/^\s*(?:[-*•]|\d+\.)\s+/, "").trim();
            const child = text.startsWith("[ ]") || text.startsWith("[x]")
                ? text.replace(/^\[( |x)\]\s+/i, "")
                : text;

            list.items.push(child);
            i += 1;
            continue;
        }

        if (list) {
            flushList();
        }

        paragraph.push(line.trim());
        i += 1;
    }

    flushParagraph();
    flushList();
    flushQuote();

    return blocks.map((block, index) => {
        const key = `md-${index}`;

        switch (block.type) {
            case "heading": {
                const Heading = `h${Math.min(block.level, 4)}`;
                return <Heading key={key}>{renderInline(block.text, key)}</Heading>;
            }
            case "code":
                return (
                    <pre key={key} className="markdown-code">
                        <code>{block.code}</code>
                    </pre>
                );
            case "list": {
                const List = block.style === "ol" ? "ol" : "ul";
                return (
                    <List key={key} className={block.style === "ol" ? "markdown-ol" : "markdown-ul"}>
                        {block.items.map((item, itemIndex) => (
                            <li key={`${key}-${itemIndex}`}>
                                {renderInline(item, `${key}-${itemIndex}`)}
                            </li>
                        ))}
                    </List>
                );
            }
            case "quote":
                return (
                    <blockquote key={key}>
                        {renderInline(block.text, key)}
                    </blockquote>
                );
            case "hr":
                return <hr key={key} />;
            default:
                return <p key={key}>{renderInline(block.text, key)}</p>;
        }
    });
};

export default renderMarkdown;