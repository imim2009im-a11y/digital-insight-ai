/* Design reminder: trustworthy RTL contribution flow, editorial charcoal surfaces, orange action states, and no false promise of automatic publication. */
import { useMemo, useState } from "react";
import { ArrowRight, Check, Github, Moon, Sparkles, Sun } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/contexts/ThemeContext";
import { copyText, downloadJson, isHttpUrl } from "@/lib/catalog";
import { usePageMeta } from "@/hooks/usePageMeta";

const categories = [
  "ذكاء اصطناعي",
  "كتابة ومحادثة",
  "تصميم",
  "فيديو وصوت",
  "بحث وتعلّم",
  "إنتاجية",
  "مطورون",
];

type Suggestion = {
  name: string;
  url: string;
  category: string;
  description: string;
  label: string;
  price: string;
  logo: string;
  tags: string;
};

const initialForm: Suggestion = {
  name: "",
  url: "",
  category: categories[0],
  description: "",
  label: "",
  price: "",
  logo: "",
  tags: "",
};

export default function SuggestTool() {
  usePageMeta(
    "اقتراح أداة",
    "اقترح أداة ذكاء اصطناعي جديدة عبر نموذج منظم قابل للمراجعة والإضافة إلى الدليل."
  );
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const { theme, toggleTheme } = useTheme();

  const errors = useMemo(() => {
    const next: Partial<Record<keyof Suggestion, string>> = {};
    if (form.name.trim().length < 2) next.name = "اكتب اسم الأداة.";
    if (!isHttpUrl(form.url))
      next.url = "أدخل رابطًا صحيحًا يبدأ بـ https:// أو http://.";
    if (!form.category) next.category = "اختر تصنيفًا.";
    if (form.description.trim().length < 20)
      next.description = "اكتب وصفًا من 20 حرفًا على الأقل.";
    if (form.logo && !isHttpUrl(form.logo)) next.logo = "رابط الشعار غير صحيح.";
    return next;
  }, [form]);

  const payload = useMemo(
    () => ({
      name: form.name.trim(),
      url: form.url.trim(),
      category: form.category,
      label: form.label.trim() || "أداة مقترحة",
      description: form.description.trim(),
      ...(form.price.trim() ? { price: form.price.trim() } : {}),
      ...(form.logo.trim() ? { logo: form.logo.trim() } : {}),
      ...(form.tags.trim()
        ? {
            tags: form.tags
              .split(",")
              .map(tag => tag.trim())
              .filter(Boolean),
          }
        : {}),
    }),
    [form]
  );

  const jsonPreview = JSON.stringify(payload, null, 2);
  const update = (key: keyof Suggestion, value: string) =>
    setForm(current => ({ ...current, [key]: value }));

  const generate = async () => {
    if (Object.keys(errors).length) {
      setSubmitted(true);
      return;
    }
    const copied = await copyText(jsonPreview);
    setCopyState(copied ? "copied" : "error");
    setSubmitted(true);
    window.setTimeout(() => setCopyState("idle"), 2400);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#151514] text-[#f4efe7]">
      <header className="border-b border-white/10 bg-[#151514]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="font-display text-lg font-bold">
              دليل <span className="text-[#e8753a]">الأدوات</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#aca59d] md:flex">
            <Link href="/">الفهرس</Link>
            <Link href="/favorites">المفضلة</Link>
            <span className="text-[#e8753a]">اقتراح أداة</span>
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
              className="text-[#aca59d] hover:text-[#e8753a]"
            >
              <Github size={16} />
            </a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-14 lg:px-10 lg:py-24">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#aca59d] hover:text-[#e8753a]"
        >
          <ArrowRight size={16} /> العودة إلى الدليل
        </Link>
        <div className="mb-12 max-w-3xl">
          <div className="mb-4 flex items-center gap-3 text-sm font-medium text-[#e8753a]">
            <span className="h-px w-10 bg-[#e8753a]" /> مساهمتك تهم
          </div>
          <h1 className="font-display text-5xl font-extrabold leading-tight sm:text-7xl">
            اقترح أداة
            <br />
            <span className="text-[#e8753a]">تستحق الظهور.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#c9c2b9]">
            أرسل بيانات أداة مفيدة للمراجعة. لا تُنشر الاقتراحات تلقائيًا؛ ستحصل
            أولًا على كود JSON جاهز للمراجعة والنسخ.
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <section className="border border-white/10 bg-white/[.03] p-6 sm:p-8">
            <div className="mb-8 flex items-center gap-3 border-b border-white/10 pb-5">
              <Sparkles className="text-[#e8753a]" size={20} />
              <h2 className="font-display text-2xl font-bold">
                بيانات الاقتراح
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">
                اسم الأداة *
                <Input
                  value={form.name}
                  onChange={e => update("name", e.target.value)}
                  placeholder="مثال: Notion AI"
                  aria-invalid={submitted && Boolean(errors.name)}
                />
                {submitted && errors.name && (
                  <span className="text-xs font-normal text-[#ef9a9a]">
                    {errors.name}
                  </span>
                )}
              </label>
              <label className="grid gap-2 text-sm font-bold">
                الرابط *
                <Input
                  value={form.url}
                  onChange={e => update("url", e.target.value)}
                  placeholder="https://example.com"
                  dir="ltr"
                  aria-invalid={submitted && Boolean(errors.url)}
                />
                {submitted && errors.url && (
                  <span className="text-xs font-normal text-[#ef9a9a]">
                    {errors.url}
                  </span>
                )}
              </label>
              <label className="grid gap-2 text-sm font-bold">
                التصنيف *
                <select
                  value={form.category}
                  onChange={e => update("category", e.target.value)}
                  className="h-10 border border-white/10 bg-[#1b1b19] px-3 text-sm text-[#f4efe7]"
                >
                  {categories.map(category => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold">
                الوسم الرئيسي
                <Input
                  value={form.label}
                  onChange={e => update("label", e.target.value)}
                  placeholder="مثال: كتابة"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                الوصف *
                <textarea
                  value={form.description}
                  onChange={e => update("description", e.target.value)}
                  placeholder="اشرح بوضوح ما الذي تقدمه الأداة ولمن تفيد."
                  className="min-h-28 border border-white/10 bg-transparent p-3 text-sm text-[#f4efe7] outline-none focus:border-[#e8753a]"
                  aria-invalid={submitted && Boolean(errors.description)}
                />
                {submitted && errors.description && (
                  <span className="text-xs font-normal text-[#ef9a9a]">
                    {errors.description}
                  </span>
                )}
              </label>
              <label className="grid gap-2 text-sm font-bold">
                السعر{" "}
                <span className="font-normal text-[#8d8983]">(اختياري)</span>
                <Input
                  value={form.price}
                  onChange={e => update("price", e.target.value)}
                  placeholder="مجاني أو يبدأ من 10$"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                رابط الشعار{" "}
                <span className="font-normal text-[#8d8983]">(اختياري)</span>
                <Input
                  value={form.logo}
                  onChange={e => update("logo", e.target.value)}
                  placeholder="https://.../logo.png"
                  dir="ltr"
                  aria-invalid={submitted && Boolean(errors.logo)}
                />
                {submitted && errors.logo && (
                  <span className="text-xs font-normal text-[#ef9a9a]">
                    {errors.logo}
                  </span>
                )}
              </label>
              <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                وسوم إضافية{" "}
                <span className="font-normal text-[#8d8983]">
                  (افصل بينها بفواصل)
                </span>
                <Input
                  value={form.tags}
                  onChange={e => update("tags", e.target.value)}
                  placeholder="كتابة، إنتاجية، فرق"
                />
              </label>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={generate}
                className="rounded-none bg-[#e8753a] text-[#151514] hover:bg-[#f38b51]"
              >
                {copyState === "copied" ? <Check size={16} /> : null}
                {copyState === "copied" ? "تم نسخ الاقتراح" : "تحقق ونسخ JSON"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(initialForm);
                  setSubmitted(false);
                  setCopyState("idle");
                }}
                className="rounded-none border-white/15 bg-transparent text-[#c9c2b9]"
              >
                مسح النموذج
              </Button>
            </div>
            {copyState === "error" && (
              <p role="alert" className="mt-4 text-sm text-[#ef9a9a]">
                تعذّر النسخ تلقائيًا. حدّد الكود يدويًا من المعاينة.
              </p>
            )}
          </section>
          <section className="border border-white/10 bg-[#10100f] p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-[#e8753a]">
                  / المعاينة
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold">
                  كود JSON
                </h2>
              </div>
              <button
                type="button"
                onClick={() => downloadJson("tool-suggestion.json", payload)}
                className="text-xs text-[#aca59d] hover:text-[#e8753a]"
              >
                تنزيل الملف
              </button>
            </div>
            <pre
              dir="ltr"
              className="max-h-[620px] overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-[#c9c2b9]"
            >
              {jsonPreview}
            </pre>
            {submitted && !Object.keys(errors).length && (
              <p
                role="status"
                className="mt-5 flex items-center gap-2 text-sm text-[#e8753a]"
              >
                <Check size={15} /> الاقتراح جاهز للمراجعة.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
