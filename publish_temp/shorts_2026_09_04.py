from pathlib import Path
import json, subprocess

ROOT = Path(__file__).resolve().parent
SERIES = ROOT / "generated" / "series_2026_09_04"
OUT = ROOT / "generated" / "shorts_2026_09_04"
OUT.mkdir(parents=True, exist_ok=True)

ITEMS = [
    ("gemini-3-8-flash", "Gemini 3.8 Flash في أقل من دقيقة #Shorts"),
    ("claude-fable-5-1", "Claude Fable 5.1 في أقل من دقيقة #Shorts"),
    ("chatgpt-healthcare-sources", "ChatGPT ومصادر الرعاية الصحية في أقل من دقيقة #Shorts"),
]

def probe(path):
    raw = subprocess.check_output(["ffprobe","-v","error","-show_entries","stream=codec_type,codec_name,width,height","-show_entries","format=duration","-of","json",str(path)], text=True)
    return json.loads(raw)

def main():
    manifest=[]
    for slug,title in ITEMS:
        src = SERIES / slug / f"{slug}.mp4"
        if not src.exists():
            raise FileNotFoundError(src)
        dst_dir = OUT / slug
        dst_dir.mkdir(parents=True, exist_ok=True)
        dst = dst_dir / f"{slug}-short.mp4"
        subprocess.check_call([
            "ffmpeg","-y","-i",str(src),
            "-vf","scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
            "-c:v","libx264","-preset","veryfast","-c:a","aac","-b:a","160k","-movflags","+faststart",str(dst)
        ])
        info=probe(dst)
        streams=info.get("streams",[])
        ok_video=any(s.get("codec_type")=="video" and s.get("codec_name")=="h264" and s.get("width")==1080 and s.get("height")==1920 for s in streams)
        ok_audio=any(s.get("codec_type")=="audio" and s.get("codec_name")=="aac" for s in streams)
        if not (ok_video and ok_audio):
            raise RuntimeError(f"QA failed for {slug}: {info}")
        duration=float(info["format"]["duration"])
        meta={"title":title,"privacy":"public","expected_channel_id":"UCcifQ4YEU42ow83U7m52Fhg","format":"shorts","width":1080,"height":1920,"duration":duration,"qa":"READY_TO_PUBLISH"}
        (dst_dir/"metadata.json").write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding="utf-8")
        manifest.append({"slug":slug,"video":str(dst),"duration":duration,"qa":"READY_TO_PUBLISH"})
    (OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(manifest,ensure_ascii=False,indent=2))

if __name__ == "__main__":
    main()
