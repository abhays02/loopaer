"""GenUI — LLM-generated dynamic UI schemas.

The runtime asks a free LLM to describe a UI for a given intent, receiving
strict JSON that the frontend renders directly. This is Loopaer's "dynamic UI
renderer" principle in one endpoint: the model chooses the UI, the client
just renders. Grammar is intentionally small to keep the LLM reliable on
free-tier models.
"""
from typing import Dict, Any, List


SUPPORTED_TYPES = [
    "container", "grid", "heading", "text", "stat", "list", "card",
    "chart_bar", "badge", "divider", "kv", "callout", "code"
]


SYS = (
    "You are Loopaer's dynamic UI generator. Given an INTENT and CONTEXT, "
    "return ONLY strict JSON matching this grammar (no prose, no markdown):\n\n"
    "{\n"
    '  "title": "short H1 for the panel",\n'
    '  "subtitle": "one-line description",\n'
    '  "components": [ <Component>, ... ]\n'
    "}\n\n"
    "<Component> is one of:\n"
    '  {"type":"heading","text":"...","level":1|2|3}\n'
    '  {"type":"text","content":"..."}\n'
    '  {"type":"stat","label":"...","value":"...","accent":"acid|cyan|amber|ivory"}\n'
    '  {"type":"list","items":["...","..."]}\n'
    '  {"type":"kv","pairs":[{"k":"key","v":"value"},...]}\n'
    '  {"type":"badge","text":"...","tone":"acid|cyan|amber|hot|ivory"}\n'
    '  {"type":"card","title":"...","body":"..."}\n'
    '  {"type":"chart_bar","data":[{"label":"a","value":42},...]}\n'
    '  {"type":"grid","columns":2|3|4,"children":[<Component>,...]}\n'
    '  {"type":"container","children":[<Component>,...]}\n'
    '  {"type":"callout","tone":"acid|cyan|amber|hot","text":"..."}\n'
    '  {"type":"divider"}\n'
    '  {"type":"code","language":"json|python|js","content":"..."}\n\n'
    "Rules: 4-12 components max, keep text concise, use a heading first, "
    "prefer stat+kv+list for structured data, use callout for warnings, "
    "grid to arrange stats. Never include a component type outside the list above."
)


def build_messages(intent: str, context: Dict[str, Any] | None = None) -> List[Dict[str, str]]:
    ctx_str = ""
    if context:
        # keep context compact
        import json
        try:
            ctx_str = "\n\nCONTEXT:\n" + json.dumps(context, ensure_ascii=False)[:1400]
        except Exception:
            pass
    return [
        {"role": "system", "content": SYS},
        {"role": "user", "content": f"INTENT:\n{intent}{ctx_str}"},
    ]


def sanitize(schema: Any) -> Dict[str, Any]:
    """Ensure the returned schema is well-formed; drop unknown component types."""
    if not isinstance(schema, dict):
        return {"title": "Untitled", "subtitle": "", "components": []}
    def clean(node):
        if not isinstance(node, dict):
            return None
        t = node.get("type")
        if t not in SUPPORTED_TYPES:
            return None
        if t in ("grid", "container"):
            kids = [clean(c) for c in node.get("children", [])]
            node["children"] = [c for c in kids if c]
        return node
    comps = [clean(c) for c in schema.get("components", []) if isinstance(c, dict)]
    schema["components"] = [c for c in comps if c][:12]
    schema.setdefault("title", "Panel")
    schema.setdefault("subtitle", "")
    return schema
