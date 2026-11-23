/** Limited inline formatting. React escapes all text; model output never becomes HTML. */
export function AiMessageText({ text }: { text: string }) {
  return <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part.startsWith("`") && part.endsWith("`") ? <code key={index} className="rounded bg-muted px-1 font-mono text-[0.9em]">{part.slice(1, -1)}</code> : part
  )}</p>;
}
