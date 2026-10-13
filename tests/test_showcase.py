"""Offline documentation checks, independent of MongoDB and model access."""
from html.parser import HTMLParser
from pathlib import Path
import re
import unicodedata


ROOT = Path(__file__).resolve().parents[1]
SHOWCASE = ROOT / "docs" / "showcase"
ASSETS = ROOT / "assets" / "readme"


class LocalReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        for attr in ("href", "src", "poster"):
            if attrs.get(attr):
                self.references.append(attrs[attr])


def test_showcase_local_references_and_fragments():
    parser = LocalReferences()
    parser.feed((SHOWCASE / "index.html").read_text())
    for reference in parser.references:
        filename, _, fragment = reference.partition("#")
        if filename:
            assert (SHOWCASE / filename).is_file(), reference
        elif fragment:
            assert fragment in parser.ids, reference


def test_readme_relative_links_resolve():
    readme = (ROOT / "README.md").read_text()
    for reference in re.findall(r"\]\(([^)]+)\)", readme):
        filename, _, _ = reference.partition("#")
        if filename and not reference.startswith(("http:", "https:")):
            assert (ROOT / filename).is_file(), reference


def test_native_playback_and_static_fallback():
    html = (SHOWCASE / "index.html").read_text()
    assert "controls playsinline" in html
    assert "autoplay" not in html
    assert '<track default kind="captions"' in html
    assert "<noscript>" in html
    assert 'id="transcript"' in html
    assert "prefers-reduced-motion" in (SHOWCASE / "showcase.js").read_text()
    assert len(re.findall(r'data-time="\d+"', html)) == 5
    assert len(re.findall(r"<li><strong>", html)) == 6


def test_captions_cover_walkthrough():
    captions = (SHOWCASE / "captions.vtt").read_text()
    assert captions.startswith("WEBVTT")
    assert len(re.findall(r"-->", captions)) == 5
    assert "00:00.000 --> 00:06.000" in captions
    assert "00:26.000 --> 00:32.000" in captions


def test_assets_are_real_and_within_budgets():
    gif = ASSETS / "preview.gif"
    movie = ASSETS / "walkthrough.mp4"
    assert gif.read_bytes()[:6] in (b"GIF89a", b"GIF87a")
    assert 10_000 < gif.stat().st_size <= 2_000_000
    assert movie.read_bytes()[4:8] == b"ftyp"
    assert 10_000 < movie.stat().st_size <= 10_000_000
    webm = ASSETS / "walkthrough.webm"
    assert webm.read_bytes()[:4] == b"\x1a\x45\xdf\xa3"
    assert 10_000 < webm.stat().st_size
    assert webm.stat().st_size + movie.stat().st_size <= 10_000_000
    for name in ("poster.png", "architecture.png", "contact-sheet.png"):
        image = ASSETS / name
        assert image.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"
        assert image.stat().st_size > 10_000
    assert "<svg" in (ASSETS / "architecture.svg").read_text()


def test_authored_copy_contains_no_emoji():
    files = [ROOT / "README.md", ROOT / "docs" / "showcase-evidence.txt"]
    files += list(SHOWCASE.glob("*.js")) + list(SHOWCASE.glob("*.mjs"))
    files += [SHOWCASE / "index.html", SHOWCASE / "captions.vtt"]
    for filename in files:
        for character in filename.read_text():
            assert unicodedata.category(character) != "So", filename
