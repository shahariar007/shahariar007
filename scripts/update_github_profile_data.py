"""Refresh the image-free GitHub data section in a profile README."""

from __future__ import annotations

import json
import os
import re
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

USERNAME = os.getenv("GITHUB_USERNAME", "shahariar007")
README_PATH = Path(os.getenv("README_PATH", "README.md"))
START = "<!-- GITHUB-DATA:START -->"
END = "<!-- GITHUB-DATA:END -->"


def github_json(url: str) -> object:
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "profile-readme-updater"}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def bar(count: int, maximum: int, width: int = 18) -> str:
    filled = max(1, round((count / maximum) * width))
    return "█" * filled + "░" * (width - filled)


def clean_text(value: str | None) -> str:
    """Keep GitHub text safe inside a Markdown table cell."""
    return (value or "No public description provided.").replace("|", "\\|").replace("\n", " ")


def build_section() -> str:
    profile = github_json(f"https://api.github.com/users/{USERNAME}")
    repositories = github_json(
        f"https://api.github.com/users/{USERNAME}/repos?per_page=100&sort=updated"
    )
    if not isinstance(profile, dict) or not isinstance(repositories, list):
        raise RuntimeError("Unexpected GitHub API response.")

    languages = Counter(repo["language"] for repo in repositories if repo.get("language"))
    originals = sum(not repo.get("fork") for repo in repositories)
    forks = len(repositories) - originals
    maximum = max(languages.values(), default=1)
    language_rows = "\n".join(
        f"| `{language}` | `{bar(count, maximum)}` | {count} |"
        for language, count in languages.most_common(8)
    ) or "| No primary-language data available | - | 0 |"
    repository_rows = "\n".join(
        f"| [{repo['name']}]({repo['html_url']}) | {repo.get('language') or 'Code'} | "
        f"{str(repo.get('updated_at', ''))[:10]} | {clean_text(repo.get('description'))} |"
        for repo in repositories[:6]
    ) or "| No repositories found | - | - | - |"
    updated = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")

    return f'''{START}
### Live GitHub portfolio

| Public repositories | Original work | Forks | Followers | Following | GitHub since |
| ---: | ---: | ---: | ---: | ---: | --- |
| {profile.get("public_repos", 0)} | {originals} | {forks} | {profile.get("followers", 0)} | {profile.get("following", 0)} | {str(profile.get("created_at", ""))[:10]} |

### Primary languages by repository

| Language | Distribution | Repositories |
| --- | --- | ---: |
{language_rows}

### Recently updated repositories

| Repository | Primary language | Updated | Description |
| --- | --- | --- | --- |
{repository_rows}

*Data updated automatically from the GitHub API: {updated}. Private repositories and private enterprise work are not included.*
{END}'''


def main() -> None:
    readme = README_PATH.read_text(encoding="utf-8")
    if START not in readme or END not in readme:
        raise RuntimeError("README markers for GitHub data were not found.")
    updated = re.sub(f"{re.escape(START)}.*?{re.escape(END)}", build_section(), readme, flags=re.DOTALL)
    README_PATH.write_text(updated, encoding="utf-8")


if __name__ == "__main__":
    main()
