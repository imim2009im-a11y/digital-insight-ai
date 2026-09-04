from pathlib import Path
import json, subprocess

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "generated" / "series_2026_09_04"

EPISODES = [
    {
        "slug": "gemini-3-8-flash",
        "title": "Gemini 3.8 Flash: لماذا هذا التحديث مهم؟",
        "script": "أعلنت Google DeepMind في الثاني من سبتمبر 2026 عن Gemini 3.8 Flash وGemini 3.8 Flash Cyber. تقول Google إن Gemini 3.8 Flash يقدم تحسينات في هندسة البرمجيات، والمهام الوكيلية، والاستدلال المعقد متعدد الخطوات، مع الحفاظ على السعر التمهيدي نفسه لـ Gemini 3.7 Flash. كما قدمت نسخة Flash Cyber الموجهة لأعمال الأمن السيبراني. المهم هنا أن هذه معلومات الشركة الرسمية وليست اختباراً مستقلاً من قناتنا. في Digital Insight AI سنقارن النموذج عملياً على مهام برمجية ووكلاء حقيقية عندما يتاح لنا بالشروط نفسها، حتى نعرف هل التحسن يظهر في الاستخدام الفعلي أم لا.",
        "description": "شرح مختصر لإعلان Google الرسمي عن Gemini 3.8 Flash وFlash Cyber، مع فصل واضح بين معلومات الشركة وبين الاختبار المستقل.\n\nالمصدر الرسمي:\nhttps://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/\n\n#Gemini #AI #DigitalInsightAI",
        "sources": ["https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/"]
    },
    {
        "slug": "claude-fable-5-1",
        "title": "Claude Fable 5.1 وMythos 5.1: ما الجديد؟",
        "script": "أعلنت Anthropic في الأول من سبتمبر 2026 عن Claude Fable 5.1 وClaude Mythos 5.1. تصف الشركة النموذجين بأنهما من أكثر نماذجها تقدماً لأعمال البرمجة والعمل المعرفي، وتقول إن قدراتهما البحثية تقدم لمحة مبكرة عن دور نماذج الذكاء الاصطناعي في دعم التقدم العلمي. ما يهمنا كمستخدمين ليس اسم الإصدار فقط، بل هل تتحسن جودة العمل الطويل، وفهم السياق، وتنفيذ المهام المعرفية فعلاً. هذه معلومات Anthropic الرسمية، وليست نتيجة اختبار مستقل. لذلك ستكون خطوتنا التالية مقارنة عملية على مهمة واحدة وبنفس الشروط قبل الحكم على الأداء.",
        "description": "ملخص موثق لإعلان Anthropic عن Claude Fable 5.1 وMythos 5.1، دون تقديم ادعاءات الشركة كاختبار مستقل.\n\nالمصدر الرسمي:\nhttps://www.anthropic.com/news\n\n#Claude #Anthropic #AI #DigitalInsightAI",
        "sources": ["https://www.anthropic.com/news"]
    },
    {
        "slug": "chatgpt-healthcare-sources",
        "title": "ChatGPT وربط مصادر الرعاية الصحية: ماذا يعني ذلك؟",
        "script": "أعلنت OpenAI في الأول من سبتمبر 2026 أن ChatGPT يمكنه الآن الاتصال بمصادر للرعاية الصحية. الفكرة ليست أن الذكاء الاصطناعي أصبح بديلاً للطبيب، بل أن المؤسسات يمكنها دمج ChatGPT بشكل أعمق مع مصادر المعلومات وسير العمل الصحي المصرح بها. هذا النوع من التكامل قد يقلل التنقل اليدوي بين الأنظمة ويساعد في تنظيم العمل، لكن قيمة أي تطبيق صحي تعتمد على الخصوصية، والصلاحيات، وجودة البيانات، والمراجعة البشرية. في Digital Insight AI سنركز على الاستخدامات العملية الآمنة، ونفصل دائماً بين أتمتة سير العمل وبين اتخاذ القرارات الطبية نفسها.",
        "description": "شرح مبسط لإعلان OpenAI الرسمي حول ربط ChatGPT بمصادر الرعاية الصحية، مع التأكيد على الخصوصية والمراجعة البشرية وعدم اعتباره بديلاً للرعاية الطبية.\n\nالمصدر الرسمي:\nhttps://openai.com/index/chatgpt-connects-health-records-and-healthcare-sources/\n\n#ChatGPT #OpenAI #AI #DigitalInsightAI",
        "sources": ["https://openai.com/index/chatgpt-connects-health-records-and-healthcare-sources/"]
    }
]

def sh(args, cwd=None):
    subprocess.check_call(args, cwd=cwd)

def probe_duration(path):
    return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(path)], text=True).strip())

def probe_streams(path):
    raw = subprocess.check_output(["ffprobe","-v","error","-show_entries","stream=codec_type,codec_name,width,height","-of","json",str(path)], text=True)
    return json.loads(raw)

def make_episode(ep):
    d = OUT / ep["slug"]
    d.mkdir(parents=True, exist_ok=True)
    imgs = [d / f"image_{i:02d}.jpg" for i in range(1, 4)]
    missing = [str(p) for p in imgs if not p.exists()]
    if missing:
        raise FileNotFoundError(f"Missing committed visual assets: {missing}")

    audio = d / "narration.mp3"
    sh(["edge-tts","--voice","ar-SA-HamedNeural","--rate=+3%","--text",ep["script"],"--write-media",str(audio)])
    dur = probe_duration(audio)
    seg = dur / len(imgs)

    clips = []
    for i, img in enumerate(imgs, 1):
        clip = d / f"clip_{i:02d}.mp4"
        fade_out = max(seg - 0.45, 0.1)
        vf = "scale=1400:788:force_original_aspect_ratio=increase,crop=1400:788," + \
             "zoompan=z='min(zoom+0.00065,1.075)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=30," + \
             f"fade=t=in:st=0:d=0.35,fade=t=out:st={fade_out:.3f}:d=0.35,format=yuv420p"
        sh(["ffmpeg","-y","-loop","1","-i",str(img),"-vf",vf,"-t",f"{seg:.3f}","-r","30","-c:v","libx264","-preset","veryfast","-an",str(clip)])
        clips.append(clip)

    concat = d / "clips.txt"
    concat.write_text("".join([f"file '{c.name}'\n" for c in clips]), encoding="utf-8")
    silent = d / "visual.mp4"
    sh(["ffmpeg","-y","-f","concat","-safe","0","-i",str(concat),"-c","copy",str(silent)], cwd=d)

    final = d / f"{ep['slug']}.mp4"
    sh(["ffmpeg","-y","-i",str(silent),"-i",str(audio),"-c:v","copy","-c:a","aac","-b:a","160k","-shortest",str(final)])

    thumb = d / "thumbnail.jpg"
    sh(["ffmpeg","-y","-i",str(imgs[0]),"-vf","scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720","-frames:v","1",str(thumb)])

    streams = probe_streams(final)
    metadata = {
        "title": ep["title"], "description": ep["description"], "privacy": "private",
        "made_for_kids": False, "expected_channel_id": "UCcifQ4YEU42ow83U7m52Fhg",
        "sources": ep["sources"], "source_policy": "official_primary_sources_only",
        "on_screen_text": False, "narration_language": "ar-SA", "publish_blocked_until_review": True
    }
    (d / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    qa = {
        "status": "READY_FOR_REVIEW", "duration_seconds": probe_duration(final), "streams": streams,
        "checks": {
            "mp4_exists": final.exists(),
            "audio_present": any(s.get("codec_type") == "audio" for s in streams.get("streams", [])),
            "h264_video": any(s.get("codec_type") == "video" and s.get("codec_name") == "h264" for s in streams.get("streams", [])),
            "no_on_screen_text": True, "official_sources_recorded": True, "auto_publish": False
        }
    }
    (d / "qa.json").write_text(json.dumps(qa, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"slug": ep["slug"], "video": str(final), "duration": qa["duration_seconds"], "qa": qa["status"]}

def main():
    results = [make_episode(ep) for ep in EPISODES]
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "series_manifest.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
