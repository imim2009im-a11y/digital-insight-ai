from pathlib import Path
import subprocess, json, math
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "generated"
OUT.mkdir(parents=True, exist_ok=True)

TITLE = "GPT-6 Astra: ما الجديد فعلًا؟"
DESCRIPTION = """أعلنت OpenAI في 3 سبتمبر 2026 عن GPT-6 Astra. يشرح هذا الفيديو ما هو مؤكد رسميًا عن النموذج، مع تعليق صوتي عربي فقط ومن دون نصوص داخل الفيديو.

المصادر الرسمية:
OpenAI — GPT-6 Astra: https://openai.com/index/gpt-6-astra/
OpenAI — Safety overview: https://openai.com/index/safety-overview-gpt-6-astra/
ChatGPT Release Notes: https://help.openai.com/en/articles/6825453-chatgpt-release-notes

هذا الفيديو يستخدم تعليقًا صوتيًا ورسومًا مولّدة بمساعدة الذكاء الاصطناعي، مع مراجعة بشرية للمحتوى والمصادر.

#GPT6 #Astra #OpenAI #ChatGPT #AI #DigitalInsightAI"""

SCRIPT = """أعلنت أوبن إيه آي في الثالث من سبتمبر عام ألفين وستة وعشرين عن جي بي تي ستة أسترا. يركز النموذج على البرمجة، والبحث، واستخدام الكمبيوتر، وتنفيذ المهام المعقدة متعددة الخطوات. بدأت الإتاحة لمجموعة محدودة من المؤسسات، على أن يتوسع الوصول تدريجيًا. ومن ناحية السلامة، تقول أوبن إيه آي إن أسترا هو أول نموذج لديها يصل إلى مستوى كريتيكال في قدرات الأمن السيبراني ضمن إطار الاستعداد الخاص بها، ولهذا ترافق الإطلاق إجراءات حماية ومراقبة إضافية. الخلاصة: الإعلان مهم، لكن الحكم الحقيقي يحتاج اختبارًا عمليًا عند توفر النموذج. في ديجيتال إنسايت إيه آي سنختبره على مهام حقيقية، ونوضح ما ينجح فعلًا وما لا ينجح."""

SCENES = 7
W, H = 1280, 720

def background(scene_index):
    img = Image.new("RGB", (W, H), (5, 9, 20))
    d = ImageDraw.Draw(img)
    for y in range(H):
        k = y / H
        d.line((0, y, W, y), fill=(int(5 + 10*k), int(9 + 16*k), int(20 + 36*k)))

    # abstract technology visuals only — intentionally no text anywhere
    cx = 640 + int(120 * math.sin(scene_index * 0.8))
    cy = 360 + int(70 * math.cos(scene_index * 0.7))
    radii = [230, 170, 110]
    tones = [(18, 45, 92), (28, 78, 132), (42, 130, 175)]
    for r, c in zip(radii, tones):
        d.ellipse((cx-r, cy-r, cx+r, cy+r), outline=c, width=4)

    # network nodes
    pts = []
    for i in range(12):
        a = (i / 12) * math.tau + scene_index * 0.17
        rr = 260 + (i % 3) * 34
        x = cx + int(math.cos(a) * rr)
        y = cy + int(math.sin(a) * rr * 0.62)
        pts.append((x, y))
    for i, p in enumerate(pts):
        q = pts[(i + 3) % len(pts)]
        d.line((p[0], p[1], q[0], q[1]), fill=(34, 76, 112), width=2)
    for i, (x, y) in enumerate(pts):
        r = 7 + (i % 4) * 2
        d.ellipse((x-r, y-r, x+r, y+r), fill=(55, 190, 225))

    # moving-style luminous bars, still image per scene
    for j in range(5):
        x0 = 110 + j * 215 + (scene_index * 23) % 70
        y0 = 90 + ((j * 83 + scene_index * 41) % 500)
        d.rounded_rectangle((x0, y0, x0+95, y0+8), radius=4, fill=(55, 160, 205))

    return img

def probe(path):
    return float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path)
    ], text=True).strip())

slides = []
for i in range(SCENES):
    p = OUT / f"astra_audioonly_scene_{i+1:02d}.png"
    background(i).save(p)
    slides.append(p)

# Thumbnail is also text-free.
thumb = OUT / "GPT_6_Astra_audioonly_thumbnail.png"
background(8).save(thumb)

audio = OUT / "GPT_6_Astra_audioonly_narration.mp3"
subprocess.check_call([
    "edge-tts", "--voice", "ar-SA-HamedNeural", "--rate=-3%",
    "--text", SCRIPT, "--write-media", str(audio)
])
dur = probe(audio)
per = dur / len(slides)
concat = OUT / "astra_audioonly_slides.txt"
with concat.open("w", encoding="utf-8") as f:
    for p in slides:
        f.write(f"file '{p.name}'\n")
        f.write(f"duration {per:.3f}\n")
    f.write(f"file '{slides[-1].name}'\n")

video = OUT / "Digital_Insight_AI_GPT_6_Astra_AudioOnly_2026.mp4"
subprocess.check_call([
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-i", str(audio),
    "-vf", "scale=1280:720,format=yuv420p", "-r", "30", "-c:v", "libx264", "-preset", "veryfast",
    "-c:a", "aac", "-b:a", "160k", "-shortest", str(video)
], cwd=OUT)

metadata = {
    "title": TITLE,
    "description": DESCRIPTION,
    "tags": ["GPT-6", "Astra", "OpenAI", "ChatGPT", "AI", "Digital Insight AI"],
    "privacy": "public",
    "made_for_kids": False,
    "expected_channel_id": "UCcifQ4YEU42ow83U7m52Fhg",
    "sources_verified_on": "2026-09-04",
    "on_screen_text": False,
    "narration_language": "ar-SA"
}
(OUT / "GPT_6_Astra_audioonly_metadata.json").write_text(
    json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(json.dumps({"video": str(video), "duration": dur, "thumbnail": str(thumb), "on_screen_text": False}, ensure_ascii=False))
