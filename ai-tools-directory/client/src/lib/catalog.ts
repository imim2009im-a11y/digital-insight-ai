// Shared catalog contracts: validate external JSON defensively and keep browser-only persistence safe.
export type Tool = {
  name: string;
  url: string;
  category: string;
  label: string;
  description: string;
  price?: string;
  logo?: string;
  tags?: string[];
  featured?: boolean;
};

export const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isValidTool = (value: unknown): value is Tool => {
  if (!value || typeof value !== "object") return false;
  const tool = value as Record<string, unknown>;
  return (
    ["name", "url", "category", "label", "description"].every(
      key =>
        typeof tool[key] === "string" && Boolean((tool[key] as string).trim())
    ) &&
    isHttpUrl(tool.url as string) &&
    (tool.price === undefined || typeof tool.price === "string") &&
    (tool.logo === undefined ||
      (typeof tool.logo === "string" && isHttpUrl(tool.logo))) &&
    (tool.tags === undefined ||
      (Array.isArray(tool.tags) &&
        tool.tags.every(
          tag => typeof tag === "string" && Boolean(tag.trim())
        ))) &&
    (tool.featured === undefined || typeof tool.featured === "boolean")
  );
};

export const parseCatalog = (payload: unknown): Tool[] => {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray((payload as { tools?: unknown }).tools)
  )
    throw new Error("Invalid catalog shape");
  return (payload as { tools: unknown[] }).tools
    .filter(isValidTool)
    .map(tool => ({
      ...tool,
      tags: tool.tags?.map(tag => tag.trim()).filter(Boolean),
    }));
};

const STORAGE_KEY = "ai-tools-directory:saved";
export const loadSavedTools = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );
    return Array.isArray(parsed) &&
      parsed.every(item => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
};
export const saveSavedTools = (names: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    /* Storage can be unavailable in private contexts. */
  }
};

export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Fall through to the legacy selection path. */
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
};
