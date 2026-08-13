// Style reminder: neo-editorial utility system, RTL-first, charcoal surfaces, burnt signal orange, asymmetric control-room layout.
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpLeft,
  Bookmark,
  Check,
  ExternalLink,
  Filter,
  Github,
  Grid2X2,
  Layers3,
  Search,
  Sparkles,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import ToolShareButton from "@/components/ToolShareButton";
import {
  loadSavedTools,
  loadSavedDates,
  parseCatalog,
  saveSavedDates,
  saveSavedTools,
  type Tool,
} from "@/lib/catalog";

const defaultCategories = [
  "الكل",
  "ذكاء اصطناعي",
  "تصميم",
  "بحث وتعلم",
  "مطورون",
  "إنتاجية",
  "خصوصية وأمان",
  "صوت وموسيقى",
  "ملفات ووسائط",
];

export default function Home() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<"relevance" | "name">("relevance");
  const [saved, setSaved] = useState<string[]>(loadSavedTools);
  const [savedDates, setSavedDates] =
    useState<Record<string, number>>(loadSavedDates);
  const { theme, toggleTheme } = useTheme();
  const [showSaved, setShowSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch("/tools.json")
      .then(response => {
        if (!response.ok) throw new Error("تعذّر تحميل ملف الأدوات");
        return response.json() as Promise<unknown>;
      })
      .then(payload => setTools(parseCatalog(payload)))
      .catch(() =>
        setLoadError(
          "تعذّر تحميل قائمة الأدوات. تحقّق من ملف tools.json ثم حاول مرة أخرى."
        )
      )
      .finally(() => setIsLoading(false));
  }, []);

  const categories = useMemo(
    () => [
      ...defaultCategories.slice(0, 1),
      ...defaultCategories
        .slice(1)
        .filter(item => tools.some(tool => tool.category === item)),
    ],
    [tools]
  );

  const availableTags = useMemo(
    () =>
      Array.from(new Set(tools.flatMap(tool => tool.tags || []))).sort((a, b) =>
        a.localeCompare(b, "ar")
      ),
    [tools]
  );

  const filtered = useMemo(
    () =>
      tools
        .filter(tool => {
          const matchesCategory =
            category === "الكل" || tool.category === category;
          const matchesQuery =
            !query ||
            `${tool.name} ${tool.description} ${tool.label} ${tool.category} ${(tool.tags || []).join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase());
          const matchesTags =
            selectedTags.length === 0 ||
            selectedTags.every(tag => tool.tags?.includes(tag));
          const matchesSaved = !showSaved || saved.includes(tool.name);
          return matchesCategory && matchesQuery && matchesTags && matchesSaved;
        })
        .sort((a, b) =>
          sortMode === "name" ? a.name.localeCompare(b.name, "ar") : 0
        ),
    [category, query, selectedTags, saved, showSaved, sortMode, tools]
  );

  useEffect(() => {
    saveSavedTools(saved);
    saveSavedDates(savedDates);
  }, [saved, savedDates]);

  const toggleSaved = (name: string) => {
    setSaved(current =>
      current.includes(name)
        ? current.filter(item => item !== name)
        : [...current, name]
    );
    setSavedDates(current => {
      const next = { ...current };
      if (name in next) delete next[name];
      else next[name] = Date.now();
      return next;
    });
  };

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
          <a
            href="#top"
            className="group flex items-center gap-3"
            aria-label="دليل الأدوات - البداية"
          >
            <img
              src="/manus-storage/ai-tools-logo_dfcf5f40.png"
              alt=""
              className="h-9 w-9 rounded-full object-contain"
            />
            <span className="font-display text-lg font-bold tracking-tight">
              دليل <span className="text-[#e8753a]">الأدوات</span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-[#aca59d] md:flex">
            <a
              className="transition-colors hover:text-[#f4efe7]"
              href="#directory"
            >
              الفهرس
            </a>
            <a
              className="transition-colors hover:text-[#f4efe7]"
              href="#method"
            >
              عن الدليل
            </a>
            <Link
              className="transition-colors hover:text-[#e8753a]"
              href="/add-tool"
            >
              إضافة أداة
            </Link>
            <Link
              className="transition-colors hover:text-[#e8753a]"
              href="/suggest-tool"
            >
              اقترح أداة
            </Link>
            <Link
              className="transition-colors hover:text-[#e8753a]"
              href="/content-tools"
            >
              أدوات المحتوى
            </Link>
            <Link
              className="transition-colors hover:text-[#e8753a]"
              href="/favorites"
            >
              المفضلة
            </Link>
            <span className="flex items-center gap-2 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e8753a]" /> يتجدّد
              باستمرار
            </span>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الليلي"
              }
              className="rounded-full border border-white/10 p-2 text-[#aca59d] transition-colors hover:border-[#e8753a] hover:text-[#e8753a]"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a
              href="https://github.com/imim2009im-a11y/digital-insight-ai"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-[#aca59d] transition-colors hover:text-[#e8753a]"
            >
              <Github size={16} />{" "}
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <main id="top" className="relative z-10">
        <section className="relative isolate overflow-hidden border-b border-white/10">
          <img
            src="/manus-storage/ai-tools-hero_159ba617.png"
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-l from-[#151514]/15 via-[#151514]/60 to-[#151514]" />
          <div className="mx-auto grid min-h-[590px] max-w-[1440px] items-end gap-12 px-5 pb-16 pt-24 lg:grid-cols-[1fr_0.7fr] lg:px-10 lg:pb-24">
            <div className="max-w-3xl">
              <div className="mb-7 flex items-center gap-3 text-sm font-medium text-[#e8753a]">
                <span className="h-px w-10 bg-[#e8753a]" /> فهرس عملي للإنترنت
                المفيد
              </div>
              <h1 className="font-display max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-[-0.04em] text-[#f4efe7] sm:text-7xl lg:text-[92px]">
                لا تبحث
                <br />
                <span className="text-[#e8753a]">من الصفر.</span>
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-9 text-[#c9c2b9]">
                مجموعة منتقاة من الأدوات التي تختصر عليك ساعات من العمل. ابحث
                حسب المهمة، جرّب بوعي، واحتفظ بما يفيدك.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <a
                  href="#directory"
                  className="group inline-flex items-center gap-3 bg-[#e8753a] px-5 py-3 text-sm font-bold text-[#151514] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[.97]"
                >
                  تصفح الفهرس{" "}
                  <ArrowUpLeft
                    size={17}
                    className="transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1"
                  />
                </a>
                <button
                  onClick={() => {
                    setShowSaved(true);
                    document
                      .getElementById("directory")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-3 border border-white/20 px-5 py-3 text-sm font-bold text-[#f4efe7] transition-colors hover:border-[#e8753a] hover:text-[#e8753a]"
                >
                  <Bookmark size={17} /> المفضلة ({saved.length})
                </button>
              </div>
            </div>
            <div className="hidden justify-self-end lg:block">
              <div className="border border-white/15 bg-[#151514]/70 p-5 backdrop-blur-md">
                <div className="mb-12 flex items-center justify-between gap-24 text-[11px] uppercase tracking-[.22em] text-[#8d8983]">
                  <span>Directory / 01</span>
                  <span>2026</span>
                </div>
                <div className="flex items-end gap-4">
                  <span className="font-display text-8xl font-extrabold leading-none text-[#e8753a]">
                    {tools.length}
                  </span>
                  <span className="mb-2 max-w-[100px] text-sm leading-5 text-[#c9c2b9]">
                    خيارًا
                    <br />
                    جاهزًا للاكتشاف
                  </span>
                </div>
                <div className="mt-6 h-px w-full bg-white/15" />
                <div className="mt-4 flex items-center gap-2 text-xs text-[#8d8983]">
                  <Sparkles size={13} className="text-[#e8753a]" /> أدوات عملية،
                  دون ضجيج
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="directory"
          className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10 lg:py-24"
        >
          <div className="mb-10 flex flex-col justify-between gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[.24em] text-[#e8753a]">
                / دليل الأدوات
              </p>
              <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
                اختر مهمتك، لا أداتك
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#9c968e]">
              كل بطاقة تقودك إلى الموقع مباشرة. راجع شروط الاستخدام والخصوصية
              قبل رفع ملفاتك أو مشاركة بياناتك.
            </p>
          </div>
          <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#8d8983]">
                <Filter size={14} /> تصفية حسب المجال
              </div>
              <div className="flex gap-2 overflow-x-auto pb-3 lg:flex-col lg:overflow-visible">
                {categories.map(item => (
                  <button
                    key={item}
                    onClick={() => {
                      setCategory(item);
                      setSelectedTags([]);
                      setShowSaved(false);
                    }}
                    className={`whitespace-nowrap border px-3 py-2 text-right text-sm transition-all ${category === item && !showSaved ? "border-[#e8753a] bg-[#e8753a] font-bold text-[#151514]" : "border-white/10 text-[#aaa39b] hover:border-white/35 hover:text-white"}`}
                  >
                    {item}
                    <span className="mr-2 text-xs opacity-60">
                      {item === "الكل"
                        ? tools.length
                        : tools.filter(t => t.category === item).length}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[.16em] text-[#8d8983]">
                  <span>الوسوم</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="text-[#e8753a]"
                  >
                    مسح
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.slice(0, 18).map(tag => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() =>
                        setSelectedTags(current =>
                          current.includes(tag)
                            ? current.filter(item => item !== tag)
                            : [...current, tag]
                        )
                      }
                      className={`border px-2 py-1 text-xs transition-colors ${selectedTags.includes(tag) ? "border-[#e8753a] bg-[#e8753a] text-[#151514]" : "border-white/10 text-[#aaa39b] hover:border-white/35"}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowSaved(value => !value)}
                className={`mt-4 flex w-full items-center justify-between border px-3 py-2 text-sm transition-colors ${showSaved ? "border-[#e8753a] text-[#e8753a]" : "border-white/10 text-[#aaa39b] hover:border-white/35"}`}
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
                    placeholder="ابحث عن أداة، مهمة، أو مجال..."
                    className="h-12 rounded-none border-white/15 bg-white/[.04] pr-12 text-[#f4efe7] placeholder:text-[#77716b] focus-visible:border-[#e8753a] focus-visible:ring-[#e8753a]/20"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="مسح البحث"
                      onClick={() => setQuery("")}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#77716b] hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 border border-white/10 px-4 text-sm text-[#8d8983]">
                  <Grid2X2 size={15} className="text-[#e8753a]" />{" "}
                  {filtered.length} نتيجة
                </div>
                <select
                  aria-label="ترتيب النتائج"
                  value={sortMode}
                  onChange={e =>
                    setSortMode(e.target.value as "relevance" | "name")
                  }
                  className="border border-white/10 bg-transparent px-3 text-sm text-[#8d8983]"
                >
                  <option value="relevance">الترتيب الافتراضي</option>
                  <option value="name">الاسم أبجديًا</option>
                </select>
              </div>
              {isLoading ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="min-h-[220px] animate-pulse border border-white/10 bg-white/[.04] p-5"
                    >
                      <div className="h-4 w-1/4 bg-white/10" />
                      <div className="mt-12 h-5 w-2/3 bg-white/10" />
                      <div className="mt-4 h-3 w-full bg-white/10" />
                      <div className="mt-2 h-3 w-4/5 bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : loadError ? (
                <div className="border border-dashed border-[#e8753a]/50 px-6 py-20 text-center">
                  <Layers3 className="mx-auto mb-4 text-[#e8753a]" size={28} />
                  <h3 className="font-display text-2xl font-bold">
                    تعذّر تحميل الدليل
                  </h3>
                  <p className="mt-2 text-sm text-[#8d8983]">{loadError}</p>
                </div>
              ) : filtered.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((tool, index) => (
                    <article
                      key={tool.name}
                      data-filter-result
                      className="group relative flex min-h-[220px] flex-col justify-between border border-white/10 bg-[#1b1b19]/85 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#e8753a]/70 hover:bg-[#22211f]"
                      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                    >
                      <div>
                        <div className="mb-7 flex items-start justify-between">
                          <span className="font-display text-4xl font-extrabold text-white/[.08]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <button
                            aria-label={`حفظ ${tool.name}`}
                            onClick={() => toggleSaved(tool.name)}
                            className={`rounded-full p-2 transition-colors ${saved.includes(tool.name) ? "bg-[#e8753a] text-[#151514]" : "bg-white/[.06] text-[#8d8983] hover:text-[#e8753a]"}`}
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
                        <h3 className="font-display text-xl font-bold text-[#f4efe7]">
                          {tool.name}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#9c968e]">
                          {tool.description}
                        </p>
                      </div>
                      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                        <ToolShareButton tool={tool} />
                        <Badge
                          variant="outline"
                          className="rounded-none border-white/15 bg-transparent text-[10px] font-normal text-[#8d8983]"
                        >
                          {tool.label}
                        </Badge>
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-xs font-bold text-[#c9c2b9] transition-colors hover:text-[#e8753a]"
                        >
                          زيارة الموقع <ExternalLink size={14} />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-white/15 px-6 py-20 text-center">
                  <Layers3 className="mx-auto mb-4 text-[#e8753a]" size={28} />
                  <h3 className="font-display text-2xl font-bold">
                    لا توجد نتائج بهذه الصيغة
                  </h3>
                  <p className="mt-2 text-sm text-[#8d8983]">
                    جرّب كلمة أخرى أو أعد ضبط الفلاتر.
                  </p>
                  <Button
                    onClick={() => {
                      setQuery("");
                      setCategory("الكل");
                      setSelectedTags([]);
                      setShowSaved(false);
                    }}
                    className="mt-6 rounded-none bg-[#e8753a] text-[#151514] hover:bg-[#f38b51]"
                  >
                    إظهار الكل
                  </Button>{" "}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="method" className="border-t border-white/10 bg-[#1b1b19]">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 lg:grid-cols-[.8fr_1.2fr] lg:px-10 lg:py-20">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[.24em] text-[#e8753a]">
                / ملاحظة تحريرية
              </p>
              <h2 className="font-display max-w-md text-4xl font-bold leading-tight">
                الأداة الجيدة ليست دائمًا الأكثر شهرة.
              </h2>
            </div>
            <div className="max-w-2xl text-[#aaa39b]">
              <p className="text-lg leading-9">
                هذا الدليل يجمع أدوات من مجالات مختلفة، لكن وجودها هنا لا يعني
                أنها مناسبة لكل استخدام. لا ترفع بيانات حساسة إلى خدمة لا تثق
                بها، وتحقق من حقوق المحتوى قبل التنزيل أو إعادة الاستخدام.
              </p>
              <div className="mt-8 flex flex-wrap gap-6 text-sm">
                <span className="flex items-center gap-2 text-[#f4efe7]">
                  <Check size={16} className="text-[#e8753a]" /> روابط مباشرة
                </span>
                <span className="flex items-center gap-2 text-[#f4efe7]">
                  <Check size={16} className="text-[#e8753a]" /> تصنيف حسب
                  المهمة
                </span>
                <span className="flex items-center gap-2 text-[#f4efe7]">
                  <Check size={16} className="text-[#e8753a]" /> تجربة عربية RTL
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-4 px-5 py-7 text-xs text-[#77716b] sm:flex-row lg:px-10">
          <span>دليل الأدوات — ابحث أقل، أنجز أكثر.</span>
          <a
            href="https://github.com/imim2009im-a11y/digital-insight-ai"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 transition-colors hover:text-[#e8753a]"
          >
            <Github size={13} /> مفتوح على GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
