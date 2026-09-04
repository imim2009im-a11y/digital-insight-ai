import series_2026_09_04 as series

CLAUDE_THIRD_IMAGE = "https://dnznrvs05pmza.cloudfront.net/gemini/gemini-3.1-flash-lite-image/images/8eadb7a9-54e5-4722-8201-a0e1a524a5be/Cinematic_AI_research_documentary_scene__a_futuristic_scient.jpg?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiNzk1OWY2MWY3YjllMWQzMSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4ODY2MjA0N30.E76YED9p-fj0fa2iHgUUjvtQNZmS9pPl7lz8wE2EO8E"

for episode in series.EPISODES:
    if episode.get("slug") == "claude-fable-5-1":
        episode["images"][2] = CLAUDE_THIRD_IMAGE

if __name__ == "__main__":
    series.main()
