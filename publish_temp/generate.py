from pathlib import Path
import subprocess, json
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "generated"
OUT.mkdir(parents=True, exist_ok=True)

TITLE = "3 تحديثات AI مهمة هذا الأسبوع"
DESCRIPTION = """ثلاثة تحديثات مهمة في الذكاء الاصطناعي هذا الأسبوع: Gemini لفهم الفيديو، Claude Fable 5.1، وتوسّع موصلات ChatGPT.\n\nالمصادر الرسمية:\nGoogle: https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-agentic-video-in-gemini/\nAnthropic: https://www.anthropic.com/news\nOpenAI: https://openai.com/index/chatgpt-connects-health-records-and-healthcare-sources/\n\nهذا الفيديو يستخدم تعليقًا صوتيًا ورسومًا مولّدة بمساعدة الذكاء الاصطناعي، مع مراجعة بشرية للمحتوى والمصادر.\n\n#الذكاء_الاصطناعي #AI #Gemini #Claude #ChatGPT #DigitalInsightAI"""
SCRIPT = """خلال يوم واحد ظهرت ثلاثة تحديثات كبيرة في عالم الذكاء الاصطناعي. جوجل تطور فهم الفيديو داخل Gemini، وأنثروبيك تطلق Claude Fable 5.1، وOpenAI توسع طريقة اتصال ChatGPT بالمصادر وسير العمل. ما الذي يهمك فعلاً كمستخدم أو صاحب مشروع رقمي؟ نبدأ مع Google. في الأول من سبتمبر 2026 أعلنت الشركة عن قدرات جديدة لفهم الفيديو داخل نماذج Gemini Flash. ووفق أرقام Google يمكن لهذا الأسلوب في بعض الاختبارات تقليل استهلاك التوكنز حتى ثمانية وثمانين بالمئة، وخفض التكلفة حتى ستة وستين بالمئة، مع تحسن في الجودة يصل إلى سبعة بالمئة. هذه أرقام Google الرسمية وليست اختباراً أجريناه نحن. التحديث الثاني من Anthropic. في الأول من سبتمبر أعلنت الشركة عن Claude Fable 5.1 وClaude Mythos 5.1. Fable 5.1 موجه للبرمجة والعمل المعرفي، بينما Mythos 5.1 وصوله محدود. أما OpenAI فأعلنت في الأول من سبتمبر توسع اتصال ChatGPT بمصادر الرعاية الصحية وسير العمل المتصل. الخلاصة: الذكاء الاصطناعي ينتقل من مرحلة الإجابة إلى مرحلة تنفيذ العمل. في Digital Insight AI سنختبر الأدوات عملياً ونوضح أين تستحق وقتك ومالك. إذا كنت تريد اختبارات عملية بدل الأخبار فقط، اشترك في Digital Insight AI."""

SLIDES = [
    ("3 تحديثات AI مهمة", "Gemini • Claude • ChatGPT"),
    ("Google Gemini", "فهم فيديو أكثر كفاءة"),
    ("حتى 88%", "خفض التوكنز وفق اختبارات Google"),
    ("Claude Fable 5.1", "للبرمجة والعمل المعرفي"),
    ("OpenAI", "موصلات وسير عمل أكثر تكاملاً"),
    ("ما الذي يعنيه هذا؟", "تكلفة أقل • تنفيذ أطول • أتمتة أفضل"),
    ("Digital Insight AI", "اختبارات عملية بدل نقل الأخبار فقط"),
]

def ar(text):
    return get_display(arabic_reshaper.reshape(text))

def find_font(weight="Regular"):
    pattern = "Noto Sans Arabic:style=Bold" if weight == "Bold" else "Noto Sans Arabic"
    p = subprocess.check_output(["fc-match", "-f", "%{file}", pattern], text=True).strip()
    return p

BOLD = find_font("Bold")
REG = find_font("Regular")

def card(path, heading, sub, accent=(36, 220, 255)):
    w, h = 1280, 720
    img = Image.new("RGB", (w, h), (5, 10, 24))
    d = ImageDraw.Draw(img)
    for y in range(h):
        k = y / h
        d.line((0, y, w, y), fill=(int(5+8*k), int(10+10*k), int(24+24*k)))
    d.ellipse((860, -180, 1370, 330), fill=(20, 42, 88))
    d.ellipse((-220, 500, 410, 980), fill=(18, 32, 68))
    d.rounded_rectangle((72, 70, 260, 108), radius=18, fill=accent)
    d.text((72, 150), ar(heading), font=ImageFont.truetype(BOLD, 64), fill="white")
    d.text((72, 260), ar(sub), font=ImageFont.truetype(REG, 36), fill=(190, 205, 226))
    d.text((72, 625), "Digital Insight AI", font=ImageFont.truetype(BOLD, 30), fill=accent)
    img.save(path)

def probe(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)], text=True).strip())

slides = []
for i, (h, s) in enumerate(SLIDES, 1):
    p = OUT / f"slide_{i:02d}.png"
    card(p, h, s)
    slides.append(p)
thumb = OUT / "thumbnail.png"
card(thumb, "3 تحديثات AI مهمة", "هذا الأسبوع • Gemini • Claude • ChatGPT", (120, 96, 255))

audio = OUT / "narration.mp3"
subprocess.check_call(["edge-tts", "--voice", "ar-SA-HamedNeural", "--text", SCRIPT, "--write-media", str(audio)])
dur = probe(audio)
per = dur / len(slides)
concat = OUT / "slides.txt"
with concat.open("w", encoding="utf-8") as f:
    for p in slides:
        f.write(f"file '{p.name}'\n")
        f.write(f"duration {per:.3f}\n")
    f.write(f"file '{slides[-1].name}'\n")

video = OUT / "Digital_Insight_AI_3_AI_Updates_2026.mp4"
subprocess.check_call([
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-i", str(audio),
    "-vf", "scale=1280:720,format=yuv420p", "-r", "30", "-c:v", "libx264", "-preset", "veryfast",
    "-c:a", "aac", "-b:a", "128k", "-shortest", str(video)
], cwd=OUT)

(OUT / "metadata.json").write_text(json.dumps({
    "title": TITLE,
    "description": DESCRIPTION,
    "tags": ["الذكاء الاصطناعي", "AI", "Gemini", "Claude", "ChatGPT", "Digital Insight AI"],
    "privacy": "public",
    "made_for_kids": False,
    "expected_channel_id": "UCcifQ4YEU42ow83U7m52Fhg"
}, ensure_ascii=False, indent=2), encoding="utf-8")
print(video)
