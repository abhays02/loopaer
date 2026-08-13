"""External research sources: arXiv + GitHub."""
import httpx
import xml.etree.ElementTree as ET
from typing import List, Dict, Any


async def fetch_arxiv(topic: str, limit: int = 6) -> List[Dict[str, Any]]:
    url = (
        f"https://export.arxiv.org/api/query?search_query=all:{topic}"
        f"&start=0&max_results={limit}&sortBy=submittedDate&sortOrder=descending"
    )
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as http:
            r = await http.get(url)
            r.raise_for_status()
    except Exception:
        return []
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    try:
        root = ET.fromstring(r.text)
    except Exception:
        return []
    papers = []
    for entry in root.findall("atom:entry", ns):
        title = (entry.findtext("atom:title", default="", namespaces=ns) or "").strip()
        summary = (entry.findtext("atom:summary", default="", namespaces=ns) or "").strip()
        link = ""
        for l in entry.findall("atom:link", ns):
            if l.get("rel") == "alternate":
                link = l.get("href", "")
                break
        published = entry.findtext("atom:published", default="", namespaces=ns) or ""
        authors = [a.findtext("atom:name", default="", namespaces=ns) for a in entry.findall("atom:author", ns)]
        papers.append({
            "kind": "paper",
            "source": "arXiv",
            "title": title,
            "abstract": summary[:400],
            "url": link,
            "published": published[:10],
            "authors": [a for a in authors if a][:4],
        })
    return papers


async def fetch_github(topic: str, limit: int = 6) -> List[Dict[str, Any]]:
    url = "https://api.github.com/search/repositories"
    q = f"{topic} in:name,description,readme"
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as http:
            r = await http.get(
                url,
                params={"q": q, "sort": "stars", "order": "desc", "per_page": limit},
                headers={"Accept": "application/vnd.github+json"},
            )
            if r.status_code != 200:
                return []
            data = r.json()
    except Exception:
        return []
    repos = []
    for it in data.get("items", []):
        repos.append({
            "kind": "repo",
            "source": "GitHub",
            "title": it.get("full_name", ""),
            "description": (it.get("description") or "")[:280],
            "url": it.get("html_url", ""),
            "stars": it.get("stargazers_count", 0),
            "language": it.get("language", ""),
            "topics": (it.get("topics") or [])[:5],
        })
    return repos
