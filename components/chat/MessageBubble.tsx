import { cn } from '@/lib/utils';
import type { ChatMessage } from './useBotpressChat';

interface MessageBubbleProps {
  message: ChatMessage;
}

// Render bot message content — handles the markdown-like formats the bot produces
function BotMessageContent({ text }: { text: string }) {
  // Split into paragraphs on double newlines, then process each line
  const paragraphs = text.split(/\n{2,}/);

  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph, pi) => {
        const lines = paragraph.split('\n');
        return (
          <div key={pi} className="space-y-1">
            {lines.map((line, li) => renderLine(line, `${pi}-${li}`))}
          </div>
        );
      })}
    </div>
  );
}

function renderLine(line: string, key: string) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Bullet point
  if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
    return (
      <div key={key} className="flex gap-2 items-start">
        <span className="text-brown-400 mt-0.5 shrink-0">·</span>
        <span>{renderInline(trimmed.slice(2))}</span>
      </div>
    );
  }

  // Numbered list
  if (/^\d+\.\s/.test(trimmed)) {
    const num = trimmed.match(/^(\d+)\.\s/)?.[1];
    const content = trimmed.replace(/^\d+\.\s/, '');
    return (
      <div key={key} className="flex gap-2 items-start">
        <span className="text-brown-500 font-semibold shrink-0 text-sm">{num}.</span>
        <span>{renderInline(content)}</span>
      </div>
    );
  }

  // Sanity product image  ![alt](url)
  const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (imgMatch) {
    return (
      <img
        key={key}
        src={imgMatch[2]}
        alt={imgMatch[1]}
        className="rounded-xl w-full max-w-[200px] object-cover shadow-sm mt-1"
      />
    );
  }

  return <p key={key}>{renderInline(trimmed)}</p>;
}

function renderInline(text: string): React.ReactNode {
  // We process inline formatting: **bold**, [text](url), plain urls
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let index = 0;

  const patterns = [
    // Bold: **text**
    { re: /\*\*(.+?)\*\*/, render: (m: RegExpMatchArray) => <strong key={index++} className="font-semibold text-charcoal-900">{m[1]}</strong> },
    // Markdown link: [text](url)
    { re: /\[([^\]]+)\]\(([^)]+)\)/, render: (m: RegExpMatchArray) => renderLink(m[1], m[2], index++) },
    // Image: ![alt](url) — inline
    { re: /!\[([^\]]*)\]\(([^)]+)\)/, render: (m: RegExpMatchArray) => <img key={index++} src={m[2]} alt={m[1]} className="inline rounded w-6 h-6 object-cover" /> },
  ];

  while (remaining.length > 0) {
    let earliest: { index: number; length: number; node: React.ReactNode } | null = null;

    for (const { re, render } of patterns) {
      const match = remaining.match(re);
      if (match && match.index !== undefined) {
        if (!earliest || match.index < earliest.index) {
          earliest = {
            index: match.index,
            length: match[0].length,
            node: render(match),
          };
        }
      }
    }

    if (!earliest) {
      parts.push(remaining);
      break;
    }

    if (earliest.index > 0) {
      parts.push(remaining.slice(0, earliest.index));
    }
    parts.push(earliest.node);
    remaining = remaining.slice(earliest.index + earliest.length);
  }

  return <>{parts}</>;
}

function renderLink(label: string, url: string, key: number): React.ReactNode {
  const isStripe = url.includes('checkout.stripe.com');

  if (isStripe) {
    return (
      <a
        key={key}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-full bg-brown-500 text-cream-50 text-sm font-medium hover:bg-brown-600 transition-colors duration-200 shadow-sm"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          <path d="M15 9H9m6 3H9m3 3H9"/>
        </svg>
        {label}
      </a>
    );
  }

  return (
    <a
      key={key}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brown-500 underline underline-offset-2 hover:text-brown-600 transition-colors"
    >
      {label}
    </a>
  );
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2 items-end', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Bot avatar */}
      {!isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden border border-cream-300 shadow-sm mb-0.5">
          <img
            src="/images/icons/bmk_logo.png"
            alt="BakeMyCake"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-brown-500 text-cream-50 rounded-br-sm'
            : 'bg-white text-charcoal-900 rounded-bl-sm shadow-sm border border-cream-200'
        )}
      >
        {isUser ? (
          <p>{message.text}</p>
        ) : (
          <BotMessageContent text={message.text} />
        )}
      </div>
    </div>
  );
}
