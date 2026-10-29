# Stargazers log

A small, static page for keeping a searchable log of GitHub repositories you have starred.

## Run locally

The page loads `events.json` with `fetch`, so serve the project over HTTP instead of opening `index.html` directly. If Python is installed:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Add repositories

Edit `events.json` and add entries to its JSON array:

```json
[
  {
    "name": "github/docs",
    "description": "GitHub documentation",
    "language": "Markdown",
    "starred": "2024-02-02"
  }
]
```

`name` can be `owner/repository` or a repository name with an `owner` field. The `starred` date is optional. The page also accepts GitHub repository fields such as `full_name`, `html_url`, and `stargazers_count`, including entries returned by the GitHub stars API with a nested `repo` object and `starred_at` timestamp. An empty array is valid.
