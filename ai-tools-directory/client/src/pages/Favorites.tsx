/* Design philosophy: RTL-first utility page, charcoal/orange editorial system, with a calm collection view that makes saved tools easy to revisit and export. */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Download,
  ExternalLink,
  Github,
  Moon,
  Sun,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import ToolShareButton from "@/components/ToolShareButton";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  downloadJson,
  getPriceKind,
  loadSavedDates,
  loadSavedTools,
  parseCatalog,
  saveSavedDates,
  saveSavedTools,
  type Tool,
} from "@/lib/catalog";

const priceOptions = [
  { value: "all", label: "كل الأسعار" },
  { value: "free", label: "مجاني" },
  { value: "paid", label: "مدفوع" },
] as const;

type PriceFilter = (typeof priceOptions)[number]["value"];
type SortMode = "date" | "name";

export default function Favorites() {
  usePageMeta(
    "أدواتك المفضلة",
    "صفحة تجمع أدوات الذكاء الاصطناعي التي حفظتها محليًا للرجوع إليها لاحقًا."
  );
  const [tools, setTools] = useState<Tool[]>([]);
  const [saved, setSaved] = useState<string[]>(loadSavedTools);
  const [savedDates, setSavedDates] =
    useState<Record<string, number>>(loadSavedDates);
  const [price, setPrice] = useState<PriceFilter>("all");
  const [sort, setSort] = useState<SortMode>("date");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    Promise.all([fetch("/tools.json"), fetch("/content-tools.json")])
      .then(async ([general, content]) => {
        if (!general.ok || !content.ok) throw new Error("catalog-load");
        const [generalPayload, contentPayload] = await Promise.all([
          general.json(),
          content.json(),
        ]);
        setTools([
          ...parseCatalog(generalPayload),
          ...parseCatalog(contentPayload),
        ]);
      })
      .catch(() => setError("تعذر تحميل الأدوات المحفوظة. حاول تحديث الصفحة."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    saveSavedTools(saved);
    saveSavedDates(savedDates);
  }, [saved, savedDates]);

  const favorites = useMemo(
    () =>
      tools
        .filter(tool => saved.includes(tool.name))
        .filter(tool => price === "all" || getPriceKind(tool.price) === price)
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name, "ar")
            : (savedDates[b.name] || 0) - (savedDates[a.name] || 0)
        ),
    [price, saved, savedDates, sort, tools]
  );

  const removeFavorite = (name: string) => {
    setSaved(current => current.filter(item => item !== name));
    setSavedDates(current => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const exportFavorites = () =>
    downloadJson("ai-tools-favorites.json", favorites);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#151514] text-[#f4efe7] selection:bg-[#e8753a] selection:text-[#151514]"
    >
      <header className="relative z-10 border-b border-white/10 bg-[#151514]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="font-display text-lg font-bold">
              دليل <span className="text-[#e8753a]">الأدوات</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[#aca59d] md:flex">
            <Link href="/" className="hover:text-[#e8753a]">
              الفهرس
            </Link>
            <Link href="/content-tools" className="hover:text-[#e8753a]">
              أدوات المحتوى
            </Link>
            <Link href="/suggest-tool" className="hover:text-[#e8753a]">
              اقترح أداة
            </Link>
            <span className="font-bold text-[#e8753a]">المفضلة</span>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الليلي"
              }
              className="rounded-full border border-white/10 p-2 text-[#aca59d] hover:border-[#e8753a] hover:text-[#e8753a]"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a
              href="https://github.com/imim2009im-a11y/digital-insight-ai"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-[#aca59d] hover:text-[#e8753a]"
            >
              <Github size={16} />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-[1440px] px-5 py-14 lg:px-10 lg:py-24">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#aca59d] hover:text-[#e8753a]"
        >
          <ArrowRight size={16} /> العودة إلى الدليل
        </Link>
        <div className="mb-12 flex flex-col justify-between gap-8 border-b border-white/10 pb-10 lg:flex-row lg:items-end">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[.24em] text-[#e8753a]">
              / مجموعتك
            </p>
            <h1 className="font-display text-5xl font-extrabold tracking-[-.04em] sm:text-7xl">
              أدواتك <span className="text-[#e8753a]">المفضلة.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#c9c2b9]">
              كل ما حفظته في مكان واحد. القائمة محفوظة محليًا في متصفحك ولا
              تُرسل إلى أي خادم.
            </p>
          </div>
          <Button
            type="button"
            onClick={exportFavorites}
            disabled={!favorites.length}
            className="rounded-none bg-[#e8753a] text-[#151514] hover:bg-[#f38b51]"
          >
            <Download size={16} /> تصدير JSON
          </Button>
        </div>
        <div className="mb-10 flex flex-col gap-3 border border-white/10 bg-white/[.03] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#8d8983]">
              {favorites.length} أداة ظاهرة
            </span>
            <span className="text-xs text-[#e8753a]">
              {saved.length} محفوظة
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              aria-label="تصفية حسب السعر"
              value={price}
              onChange={event => setPrice(event.target.value as PriceFilter)}
              className="border border-white/10 bg-transparent px-3 py-2 text-sm text-[#c9c2b9]"
            >
              <option value="all">كل الأسعار</option>
              <option value="free">مجاني</option>
              <option value="paid">مدفوع</option>
            </select>
            <select
              aria-label="ترتيب المفضلة"
              value={sort}
              onChange={event => setSort(event.target.value as SortMode)}
              className="border border-white/10 bg-transparent px-3 py-2 text-sm text-[#c9c2b9]"
            >
              <option value="date">الأحدث حفظًا</option>
              <option value="name">الاسم أبجديًا</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div
            role="status"
            className="border border-white/10 px-6 py-20 text-center text-[#8d8983]"
          >
            جارٍ تحميل المفضلة...
          </div>
        ) : error ? (
          <div
            role="alert"
            className="border border-dashed border-[#e8753a]/50 px-6 py-20 text-center text-[#c9c2b9]"
          >
            {error}
          </div>
        ) : favorites.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {favorites.map((tool, index) => (
              <article
                key={`${tool.name}-${index}`}
                data-filter-result
                className="flex min-h-[230px] flex-col justify-between border border-white/10 bg-[#1b1b19]/85 p-5 transition-all hover:-translate-y-1 hover:border-[#e8753a]/70"
              >
                <div>
                  <div className="mb-6 flex items-start justify-between">
                    <span className="font-display text-4xl font-extrabold text-white/[.08]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      aria-label={`إزالة ${tool.name} من المفضلة`}
                      onClick={() => removeFavorite(tool.name)}
                      className="rounded-full bg-[#e8753a] p-2 text-[#151514]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-[#e8753a]">
                    {tool.label}
                  </span>
                  <h2 className="mt-2 font-display text-2xl font-bold">
                    {tool.name}
                  </h2>
                  <p className="mt-3 line-clamp-2 text-sm leading-7 text-[#9c968e]">
                    {tool.description}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                  <ToolShareButton tool={tool} />
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#e8753a] hover:text-[#f38b51]"
                  >
                    زيارة الأداة <ExternalLink size={15} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-white/15 px-6 py-24 text-center">
            <h2 className="font-display text-3xl font-bold">
              لا توجد أدوات هنا بعد.
            </h2>
            <p className="mt-3 text-[#8d8983]">
              احفظ الأدوات من الدليل وستظهر في هذه الصفحة.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex bg-[#e8753a] px-5 py-3 text-sm font-bold text-[#151514]"
            >
              تصفح الدليل
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
