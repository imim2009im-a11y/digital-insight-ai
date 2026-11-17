#!/usr/bin/env python3
"""Read-only YouTube channel discovery. No transcript extraction or auto-publishing."""
import argparse
import datetime as dt
import json
import os
import pathlib
import re
import tempfile
import urllib.parse
import urllib.request

TOPICS = {
    "agents": ("agent", "mcp", "langgraph", "وكيل", "وكلاء"),
    "automation": ("n8n", "automation", "workflow", "أتمتة"),
    "models": ("llm", "model", "rag", "deepseek", "gemini", "نموذج"),
    "coding": ("code", "python", "github", "programming", "برمجة"),
    "security": ("security", "cyber", "vulnerability", "أمن", "ثغرة"),
    "business": ("saas", "seo", "business", "affiliate", "تسويق", "ربح"),
}
BASE = "https://www.googleapis.com/youtube/v3/"

def get_json(url):
    with urllib.request.urlopen(url, timeout=20) as response:
        return json.load(response)

def api(endpoint, params, key):
    params = dict(params, key=key)
    return get_json(BASE + endpoint + "?" + urllib.parse.urlencode(params))

def classify(text):
    lowered = text.lower()
    return sorted(k for k, terms in TOPICS.items() if any(x in lowered for x in terms))

def write_json_atomic(path, data):
    """Replace one JSON file only after a complete, flushed temporary write."""
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8",
                                         dir=path.parent, delete=False) as stream:
            temporary = pathlib.Path(stream.name)
            json.dump(data, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)

def process(items, previous):
    known = {r["video_id"]: r for r in previous}
    added = 0
    for item in items:
        video_id = item.get("video_id")
        if not isinstance(video_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
            continue
        if video_id in known:
            continue
        title = str(item.get("title", ""))[:300]
        description = str(item.get("description", ""))[:4000]
        known[video_id] = {
            "video_id": video_id,
            "url": "https://www.youtube.com/watch?v=" + video_id,
            "source": str(item.get("source", "")),
            "channel_id": str(item.get("channel_id", "")),
            "published_at": str(item.get("published_at", "")),
            "title": title,
            "description": description,
            "topics": classify(title + " " + description),
            "status": "metadata_only_unverified",
            "claims_tested": False,
        }
        added += 1
    return sorted(known.values(), key=lambda x: x["video_id"]), added

def collect(channels, key, per_channel):
    if not 1 <= per_channel <= 50:
        raise ValueError("per_channel must be between 1 and 50")
    videos = []
    for source in channels:
        handle = source["handle"].lstrip("@")
        data = api("channels", {"part": "contentDetails", "forHandle": "@" + handle}, key)
        found = data.get("items", [])
        if not found:
            raise RuntimeError("Channel not resolved: " + handle)
        uploads = found[0]["contentDetails"]["relatedPlaylists"]["uploads"]
        channel_id = found[0]["id"]
        data = api("playlistItems", {"part": "snippet,contentDetails", "playlistId": uploads,
                                     "maxResults": per_channel}, key)
        for entry in data.get("items", []):
            s = entry.get("snippet", {})
            v = s.get("resourceId", {}).get("videoId")
            if v:
                videos.append({"video_id": v, "source": "@" + handle,
                               "channel_id": channel_id,
                               "title": s.get("title", ""),
                               "description": s.get("description", ""),
                               "published_at": entry.get("contentDetails", {}).get("videoPublishedAt", "")})
    return videos

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sources", default="docs/research-sources/youtube-channels.json")
    parser.add_argument("--state", default="data/research/youtube-videos.json")
    parser.add_argument("--output", default="youtube-intelligence-report.json")
    parser.add_argument("--write-state", action="store_true",
                        help="Persist merged records after successful live collection; never allowed with fixtures")
    parser.add_argument("--fixture", help="Offline JSON array of raw videos; does not access YouTube")
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()
    if not 1 <= args.limit <= 50:
        parser.error("--limit must be between 1 and 50")
    if args.fixture and args.write_state:
        parser.error("--write-state cannot be used with --fixture")
    protected = [pathlib.Path(args.sources).resolve(), pathlib.Path(args.state).resolve()]
    if args.fixture:
        protected.append(pathlib.Path(args.fixture).resolve())
    output = pathlib.Path(args.output).resolve()
    if output in protected:
        parser.error("--output must differ from sources, state and fixture paths")
    if args.write_state and protected[0] == protected[1]:
        parser.error("--state must differ from --sources")
    channels = json.loads(pathlib.Path(args.sources).read_text(encoding="utf-8"))["channels"]
    existing_path = pathlib.Path(args.state)
    previous = json.loads(existing_path.read_text(encoding="utf-8")) if existing_path.exists() else []
    if args.fixture:
        items = json.loads(pathlib.Path(args.fixture).read_text(encoding="utf-8"))
        mode = "fixture"
    else:
        key = os.environ.get("YOUTUBE_API_KEY", "")
        if not key:
            raise SystemExit("Missing YOUTUBE_API_KEY; use --fixture for offline validation")
        items = collect(channels, key, args.limit)
        mode = "youtube_api_live"
    records, new_count = process(items, previous)
    summary = {
        "collected_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "mode": mode, "source_count": len(channels), "fetched": len(items),
        "new": new_count, "total_unique": len(records),
        "verified_video_content": False, "records": records
    }
    # Reports and state have separate atomic writes; fixture runs remain report-only.
    write_json_atomic(args.output, summary)
    if args.write_state:
        write_json_atomic(args.state, records)
    print(json.dumps({k: v for k, v in summary.items() if k != "records"}, ensure_ascii=False))

if __name__ == "__main__":
    main()
