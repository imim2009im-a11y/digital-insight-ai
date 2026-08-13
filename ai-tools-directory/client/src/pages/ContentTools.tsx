// Style reminder: neo-editorial utility system with charcoal surfaces, warm paper text, burnt orange accents, RTL-first interaction.
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpLeft,
  Bookmark,
  Check,
  ExternalLink,
  Filter,
  Github,
  Grid2X2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loadSavedTools,
  parseCatalog,
  saveSavedTools,
  type Tool,
} from "@/lib/catalog";

const defaults = [
  "الكل",
  "كتابة ومحادثة",
  "بحث ومصادر",
  "تسويق ومحتوى",
  "إنتاجية المحتوى",
  "تصميم بصري",
  "فيديو وحركة",
  "صوت وموسيقى",
  "عروض ومستندات",
];

export default function ContentTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const [saved, setSaved] = useState<string[]>(loadSavedTools);
  const [showSaved, setShowSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/content-tools.json")
      .then(response => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<unknown>;
      })
      .then(payload => setTools(parseCatalog(payload)))
      .catch(() =>
        setError(
          "تعذر تحميل كتالوج أدوات المحتوى. تحقق من ملف content-tools.json."
        )
      )
      .finally(() => setLoading(false));
  }, []);
  const categories = useMemo(
    () => [
      "الكل",
      ...defaults
        .slice(1)
        .filter(item => tools.some(tool => tool.category === item)),
    ],
    [tools]
  );
  const filtered = useMemo(
    () =>
      tools.filter(tool => {
        const haystack =
          `${tool.name} ${tool.category} ${tool.label} ${tool.description} ${(tool.tags || []).join(" ")}`.toLowerCase();
        return (
          (category === "الكل" || tool.category === category) &&
          (!query || haystack.includes(query.toLowerCase())) &&
          (!showSaved || saved.includes(tool.name))
        );
      }),
    [category, query, saved, showSaved, tools]
  );
  useEffect(() => {
    saveSavedTools(saved);
  }, [saved]);
  const toggleSaved = (name: string) =>
    setSaved(current =>
      current.includes(name)
        ? current.filter(item => item !== name)
        : [...current, name]
    );
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#151514] text-[#f4efe7] selection:bg-[#e8753a] selection:text-[#151514]"
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.045] mix-blend-screen"
        style={{
          backgroundImage:
            "url('/manus-storage/ai-tools-pattern_43cfa811.png')",
          backgroundSize: "700px auto",
        }}
      />
      <header className="relative z-10 border-b border-white/10 bg-[#151514]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/manus-storage/ai-tools-logo_dfcf5f40.png"
              alt=""
              className="h-9 w-9 rounded-full object-contain"
            />
            <span className="font-display text-lg font-bold">
              دليل <span className="text-[#e8753a]">المحتوى</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[#aca59d] md:flex">
            <span className="font-bold text-[#e8753a]">أدوات المحتوى</span>
            <Link
              href="/add-tool"
              className="transition-colors hover:text-[#e8753a]"
            >
              إضافة أداة
            </Link>
            <Link href="/" className="transition-colors hover:text-[#f4efe7]">
              الدليل العام
            </Link>
          </nav>
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
      </header>
      <main className="relative z-10">
        <section className="relative isolate overflow-hidden border-b border-white/10">
          <img
            src="/manus-storage/ai-tools-hero_159ba617.png"
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-l from-[#151514]/10 via-[#151514]/75 to-[#151514]" />
          <div className="mx-auto grid min-h-[500px] max-w-[1440px] items-end gap-10 px-5 pb-16 pt-24 lg:grid-cols-[1fr_.65fr] lg:px-10">
            <div>
              <div className="mb-6 flex items-center gap-3 text-sm font-medium text-[#e8753a]">
                <span className="h-px w-10 bg-[#e8753a]" /> دليل متخصص لصناع
                المحتوى
              </div>
              <h1 className="font-display max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-[-.04em] sm:text-7xl lg:text-[84px]">
                أنشئ أفضل.
                <br />
                <span className="text-[#e8753a]">بذكاء.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-9 text-[#c9c2b9]">
                أدوات للكتابة، البحث، التصميم، الفيديو، الصوت والعروض. اختر
                الأداة التي تناسب المهمة، لا الأداة التي تصرخ أكثر.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#catalog"
                  className="inline-flex items-center gap-3 bg-[#e8753a] px-5 py-3 text-sm font-bold text-[#151514] hover:bg-[#f38b51]"
                >
                  <ArrowUpLeft size={17} /> تصفح الأدوات
                </a>
                <Link
                  href="/add-tool"
                  className="inline-flex items-center gap-3 border border-white/20 px-5 py-3 text-sm font-bold hover:border-[#e8753a] hover:text-[#e8753a]"
                >
                  أضف أداة
                </Link>
              </div>
            </div>
            <div className="hidden justify-self-end lg:block">
              <div className="border border-white/15 bg-[#151514]/70 p-5 backdrop-blur-md">
                <div className="mb-12 flex justify-between text-[11px] uppercase tracking-[.22em] text-[#8d8983]">
                  <span>Content / 01</span>
                  <span>Arabic</span>
                </div>
                <div className="flex items-end gap-4">
                  <span className="font-display text-8xl font-extrabold leading-none text-[#e8753a]">
                    {tools.length}
                  </span>
                  <span className="mb-2 max-w-[100px] text-sm leading-5 text-[#c9c2b9]">
                    أداة لصناعة
                    <br />
                    المحتوى
                  </span>
                </div>
                <div className="mt-6 h-px bg-white/15" />
                <div className="mt-4 flex items-center gap-2 text-xs text-[#8d8983]">
                  <Sparkles size={13} className="text-[#e8753a]" /> من الفكرة
                  إلى النشر
                </div>
              </div>
            </div>
          </div>
        </section>
        <section
          id="catalog"
          className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10 lg:py-24"
        >
          <div className="mb-10 flex flex-col justify-between gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[.24em] text-[#e8753a]">
                / الكتالوج
              </p>
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                اختصر طريق الإنتاج
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#9c968e]">
              المعلومات هنا وصفية وليست تقييمات. راجع الخصوصية والأسعار وشروط
              الاستخدام قبل اتخاذ قرارك.
            </p>
          </div>
          <div className="grid gap-10 lg:grid-cols-[230px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#8d8983]">
                <Filter size={14} /> المجال
              </div>
              <div className="flex gap-2 overflow-x-auto pb-3 lg:flex-col lg:overflow-visible">
                {categories.map(item => (
                  <button
                    key={item}
                    onClick={() => {
                      setCategory(item);
                      setShowSaved(false);
                    }}
                    className={`whitespace-nowrap border px-3 py-2 text-right text-sm transition-all ${category === item && !showSaved ? "border-[#e8753a] bg-[#e8753a] font-bold text-[#151514]" : "border-white/10 text-[#aaa39b] hover:border-white/35 hover:text-white"}`}
                  >
                    {item}
                    <span className="mr-2 text-xs opacity-60">
                      {item === "الكل"
                        ? tools.length
                        : tools.filter(tool => tool.category === item).length}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowSaved(value => !value)}
                className={`mt-4 flex w-full items-center justify-between border px-3 py-2 text-sm ${showSaved ? "border-[#e8753a] text-[#e8753a]" : "border-white/10 text-[#aaa39b]"}`}
              >
                <span className="flex items-center gap-2">
                  <Bookmark size={14} /> المحفوظة
                </span>
                <span>{saved.length}</span>
              </button>
            </aside>
            <div>
              <div
                className="mb-8 flex flex-col gap-4 sm:flex-row"
                aria-live="polite"
              >
                <div className="relative flex-1">
                  <Search
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#77716b]"
                    size={18}
                  />
                  <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="ابحث عن أداة أو مهمة أو نوع محتوى..."
                    className="h-12 rounded-none border-white/15 bg-white/[.04] pr-12 text-[#f4efe7] placeholder:text-[#77716b] focus-visible:border-[#e8753a]"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="مسح البحث"
                      onClick={() => setQuery("")}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#77716b]"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 border border-white/10 px-4 text-sm text-[#8d8983]">
                  <Grid2X2 size={15} className="text-[#e8753a]" />{" "}
                  {filtered.length} نتيجة
                </div>
              </div>
              {loading ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="min-h-[220px] animate-pulse border border-white/10 bg-white/[.04]"
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="border border-dashed border-[#e8753a]/50 px-6 py-20 text-center">
                  <h3 className="font-display text-2xl font-bold">
                    تعذر تحميل الكتالوج
                  </h3>
                  <p className="mt-2 text-sm text-[#8d8983]">{error}</p>
                </div>
              ) : filtered.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((tool, index) => (
                    <article
                      key={tool.name}
                      className="flex min-h-[240px] flex-col justify-between border border-white/10 bg-[#1b1b19]/85 p-5 transition-all hover:-translate-y-1 hover:border-[#e8753a]/70"
                    >
                      <div>
                        <div className="mb-7 flex items-start justify-between">
                          <span className="font-display text-4xl font-extrabold text-white/[.08]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <button
                            aria-label={`حفظ ${tool.name}`}
                            onClick={() => toggleSaved(tool.name)}
                            className={`rounded-full p-2 ${saved.includes(tool.name) ? "bg-[#e8753a] text-[#151514]" : "bg-white/[.06] text-[#8d8983]"}`}
                          >
                            <Bookmark
                              size={15}
                              fill={
                                saved.includes(tool.name)
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </button>
                        </div>
                        <div className="mb-3 flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#e8753a]" />
                          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-[#e8753a]">
                            {tool.category}
                          </span>
                        </div>
                        <h3 className="font-display text-xl font-bold">
                          {tool.name}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#9c968e]">
                          {tool.description}
                        </p>
                      </div>
                      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                        <span className="text-xs text-[#8d8983]">
                          {tool.tags?.slice(0, 2).join(" · ") || tool.label}
                        </span>
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-xs font-bold text-[#c9c2b9] hover:text-[#e8753a]"
                        >
                          زيارة <ExternalLink size={14} />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-white/15 px-6 py-20 text-center">
                  <h3 className="font-display text-2xl font-bold">
                    لا توجد نتائج
                  </h3>
                  <p className="mt-2 text-sm text-[#8d8983]">
                    غيّر كلمات البحث أو أعد ضبط المجال.
                  </p>
                  <Button
                    onClick={() => {
                      setQuery("");
                      setCategory("الكل");
                      setShowSaved(false);
                    }}
                    className="mt-6 rounded-none bg-[#e8753a] text-[#151514]"
                  >
                    إظهار الكل
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] justify-between px-5 py-7 text-xs text-[#77716b] lg:px-10">
          <span>دليل المحتوى — من الفكرة إلى النشر.</span>
          <Link href="/add-tool" className="hover:text-[#e8753a]">
            إضافة أداة
          </Link>
        </div>
      </footer>
    </div>
  );
}
