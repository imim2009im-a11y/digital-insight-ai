from pathlib import Path
import subprocess, json
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "generated"
OUT.mkdir(parents=True, exist_ok=True)

TITLE = "GPT-6 Astra: ما الجديد فعلًا؟"
DESCRIPTION = """أعلنت OpenAI في 3 سبتمبر 2026 عن GPT-6 Astra، مع تحسينات في البرمجة والبحث واستخدام الكمبيوتر والعمل المعقد متعدد الخطوات. بدأت الإتاحة لمجموعة محدودة، مع توسع تدريجي خلال الأيام التالية.

الأهم: OpenAI تقول إن Astra هو أول نموذج لديها يصل إلى مستوى Critical في قدرات الأمن السيبراني ضمن Preparedness Framework، ولذلك ترافق الإطلاق إجراءات سلامة ومراقبة إضافية.

المصادر الرسمية:
OpenAI — GPT-6 Astra: https://openai.com/index/gpt-6-astra/
OpenAI — Safety overview: https://openai.com/index/safety-overview-gpt-6-astra/
ChatGPT Release Notes: https://help.openai.com/en/articles/6825453-chatgpt-release-notes

هذا الفيديو يستخدم تعليقًا صوتيًا ورسومًا مولّدة بمساعدة الذكاء الاصطناعي، مع مراجعة بشرية للمحتوى والمصادر.

#GPT6 #Astra #OpenAI #ChatGPT #AI #DigitalInsightAI"""

SCRIPT = """أعلنت OpenAI في الثالث من سبتمبر 2026 عن GPT-6 Astra. النموذج الجديد يركز على البرمجة، والبحث، واستخدام الكمبيوتر، والعمل المعقد متعدد الخطوات. الإتاحة بدأت لمجموعة محدودة من المؤسسات، وOpenAI تقول إن الوصول الأوسع سيصل تدريجياً خلال الأيام القادمة. النقطة الأهم ليست الأرقام التسويقية، بل مستوى السلامة. OpenAI تقول إن Astra هو أول نموذج لديها يصل إلى مستوى Critical في قدرات الأمن السيبراني ضمن إطار الاستعداد الخاص بها، ولهذا ترافق الإطلاق إجراءات مراقبة وحماية إضافية. الخلاصة: الإعلان مهم، لكن الحكم الحقيقي يحتاج اختباراً عملياً عندما يصبح النموذج متاحاً لنا. في Digital Insight AI سنختبره على مهام حقيقية بدل الاكتفاء بالوعود. تابع القناة للاختبار العملي القادم."""

SLIDES = [
    ("GPT-6 Astra", "إعلان جديد من OpenAI • 3 سبتمبر 2026"),
    ("ما الجديد؟", "برمجة • بحث • استخدام الكمبيوتر • مهام متعددة الخطوات"),
    ("الإتاحة", "بدأت بشكل محدود • توسع تدريجي"),
    ("النقطة الأهم", "مستوى Critical في الأمن السيبراني وفق OpenAI"),
    ("ماذا يعني ذلك؟", "حماية ومراقبة إضافية مع الإطلاق"),
    ("الحكم الحقيقي", "نختبره عمليًا عندما يصبح متاحًا"),
    ("Digital Insight AI", "اختبار عملي قريبًا"),
]

def ar(text):
    return get_display(arabic_reshaper.reshape(text))

def find_font(weight="Regular"):
    pattern = "Noto Sans Arabic:style=Bold" if weight == "Bold" else "Noto Sans Arabic"
    return subprocess.check_output(["fc-match", "-f", "%{file}", pattern], text=True).strip()

BOLD = find_font("Bold")
REG = find_font("Regular")

def card(path, heading, sub, accent=(48, 210, 255)):
    w, h = 1280, 720
    img = Image.new("RGB", (w, h), (5, 9, 20))
    d = ImageDraw.Draw(img)
    for y in range(h):
        k = y / h
        d.line((0, y, w, y), fill=(int(5+9*k), int(9+14*k), int(20+32*k)))
    d.ellipse((865, -190, 1390, 335), fill=(18, 42, 86))
    d.ellipse((-230, 485, 410, 980), fill=(13, 27, 62))
    d.rounded_rectangle((70, 66, 250, 102), radius=18, fill=accent)
    d.text((72, 145), ar(heading), font=ImageFont.truetype(BOLD, 62), fill="white")
    d.text((72, 258), ar(sub), font=ImageFont.truetype(REG, 34), fill=(194, 208, 229))
    d.line((72, 565, 1208, 565), fill=(70, 91, 125), width=2)
    d.text((72, 606), "Digital Insight AI", font=ImageFont.truetype(BOLD, 30), fill=accent)
    img.save(path)

def probe(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)], text=True).strip())

slides = []
for i, (h, s) in enumerate(SLIDES, 1):
    p = OUT / f"astra_slide_{i:02d}.png"
    card(p, h, s)
    slides.append(p)

thumb = OUT / "GPT_6_Astra_thumbnail.png"
card(thumb, "GPT-6 Astra", "ما الجديد فعلًا؟", (126, 105, 255))

audio = OUT / "GPT_6_Astra_narration.mp3"
subprocess.check_call(["edge-tts", "--voice", "ar-SA-HamedNeural", "--text", SCRIPT, "--write-media", str(audio)])
dur = probe(audio)
per = dur / len(slides)
concat = OUT / "astra_slides.txt"
with concat.open("w", encoding="utf-8") as f:
    for p in slides:
        f.write(f"file '{p.name}'\n")
        f.write(f"duration {per:.3f}\n")
    f.write(f"file '{slides[-1].name}'\n")

video = OUT / "Digital_Insight_AI_GPT_6_Astra_2026.mp4"
subprocess.check_call([
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-i", str(audio),
    "-vf", "scale=1280:720,format=yuv420p", "-r", "30", "-c:v", "libx264", "-preset", "veryfast",
    "-c:a", "aac", "-b:a", "160k", "-shortest", str(video)
], cwd=OUT)

(OUT / "GPT_6_Astra_metadata.json").write_text(json.dumps({
    "title": TITLE,
    "description": DESCRIPTION,
    "tags": ["GPT-6", "Astra", "OpenAI", "ChatGPT", "AI", "Digital Insight AI"],
    "privacy": "public",
    "made_for_kids": False,
    "expected_channel_id": "UCcifQ4YEU42ow83U7m52Fhg",
    "sources_verified_on": "2026-09-04"
}, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"video": str(video), "duration": dur, "thumbnail": str(thumb)}, ensure_ascii=False))
