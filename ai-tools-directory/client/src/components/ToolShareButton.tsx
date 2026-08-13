/* Design reminder: compact RTL action, burnt-orange accent, no modal; share should feel immediate and reversible. */
import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { copyText, type Tool } from "@/lib/catalog";

export default function ToolShareButton({ tool }: { tool: Tool }) {
  const [shared, setShared] = useState(false);
  const canNativeShare =
    typeof navigator !== "undefined" && "share" in navigator;

  const share = async () => {
    try {
      if (canNativeShare) {
        await navigator.share({
          title: tool.name,
          text: tool.description,
          url: tool.url,
        });
        setShared(true);
      } else {
        setShared(await copyText(tool.url));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShared(await copyText(tool.url));
    }
    window.setTimeout(() => setShared(false), 2200);
  };

  return (
    <button
      type="button"
      onClick={share}
      title={shared ? "تمت مشاركة الرابط" : "مشاركة الأداة"}
      aria-label={shared ? `تمت مشاركة ${tool.name}` : `مشاركة ${tool.name}`}
      className="inline-flex items-center gap-1.5 text-xs text-[#8d8983] transition-colors hover:text-[#e8753a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8753a]"
    >
      {shared ? (
        <Check size={14} />
      ) : canNativeShare ? (
        <Share2 size={14} />
      ) : (
        <Copy size={14} />
      )}
      <span>{shared ? "تمت المشاركة" : "مشاركة"}</span>
    </button>
  );
}
