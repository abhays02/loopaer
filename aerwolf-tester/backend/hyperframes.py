"""
Hyperframe library — pre-authored SVG animations for top algorithms.
Each entry defines 4-6 frames with a caption. The client cross-fades through them
(one-step "diffusion" style transition).
Frames are pure inline SVG so we render dark/neon-consistent.
"""

# palette - keep in-sync with frontend
NEON = {
    "cyan": "#00E5FF",
    "amber": "#FFB000",
    "pink": "#FF0055",
    "muted": "#6B7280",
    "bg": "#0D0D12",
}

def _wrap(inner: str, w: int = 320, h: int = 200) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="100%" height="100%">{inner}</svg>'

def _grid(w=320, h=200):
    return (
        f'<defs><pattern id="g" width="16" height="16" patternUnits="userSpaceOnUse">'
        f'<circle cx="1" cy="1" r="0.8" fill="{NEON["cyan"]}" opacity="0.15"/></pattern></defs>'
        f'<rect width="{w}" height="{h}" fill="{NEON["bg"]}"/>'
        f'<rect width="{w}" height="{h}" fill="url(#g)"/>'
    )

# ------- helpers to build frame lists -------
def frame(caption: str, body: str) -> dict:
    return {"caption": caption, "svg": _wrap(_grid() + body)}

HYPERFRAMES = {
    # ------- OCR / Vision -------
    "clahe": {
        "name": "CLAHE",
        "full_name": "Contrast Limited Adaptive Histogram Equalization",
        "family": "preprocess",
        "frames": [
            frame("Input · low-contrast image",
                  f'<rect x="60" y="40" width="200" height="120" fill="#1a1a24"/>'
                  f'<text x="160" y="105" text-anchor="middle" fill="{NEON["muted"]}" font-family="monospace" font-size="10">low contrast</text>'),
            frame("Tile the image into 8×8 grid",
                  f'<g stroke="{NEON["cyan"]}" stroke-width="0.5" fill="none" opacity="0.7">'
                  + "".join(f'<rect x="{60+i*25}" y="{40+j*15}" width="25" height="15"/>' for i in range(8) for j in range(8)) + '</g>'),
            frame("Compute local histogram per tile",
                  f'<g fill="{NEON["amber"]}" opacity="0.9">'
                  + "".join(f'<rect x="{70+i*20}" y="{110-((i*13)%40)}" width="10" height="{((i*13)%40)+15}"/>' for i in range(12)) + '</g>'
                  f'<text x="160" y="180" text-anchor="middle" fill="{NEON["muted"]}" font-family="monospace" font-size="9">clip &amp; redistribute</text>'),
            frame("Clip histogram peaks (limit contrast)",
                  f'<line x1="60" y1="80" x2="260" y2="80" stroke="{NEON["pink"]}" stroke-dasharray="3 3"/>'
                  f'<g fill="{NEON["amber"]}">'
                  + "".join(f'<rect x="{70+i*20}" y="80" width="10" height="{max(15,((i*13)%40))}"/>' for i in range(12)) + '</g>'),
            frame("Output · locally enhanced contrast",
                  f'<rect x="60" y="40" width="200" height="120" fill="url(#g2)"/>'
                  f'<defs><linearGradient id="g2" x1="0" x2="1"><stop offset="0" stop-color="#000"/><stop offset="0.5" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient></defs>'
                  f'<text x="160" y="105" text-anchor="middle" fill="{NEON["cyan"]}" font-family="monospace" font-size="10">enhanced</text>'),
        ],
    },
    "sauvola": {
        "name": "Sauvola Binarization",
        "family": "preprocess",
        "frames": [
            frame("Input · noisy grayscale document",
                  f'<rect x="60" y="40" width="200" height="120" fill="#3a3a44"/>'
                  + "".join(f'<rect x="{80+(i%8)*22}" y="{60+(i//8)*22}" width="14" height="4" fill="#88888a"/>' for i in range(24))),
            frame("Slide window (w×w) across pixels",
                  f'<rect x="60" y="40" width="200" height="120" fill="#2a2a34"/>'
                  f'<rect x="130" y="80" width="30" height="30" fill="none" stroke="{NEON["cyan"]}" stroke-width="1.5">'
                  f'<animate attributeName="x" values="60;230;60" dur="2s" repeatCount="indefinite"/></rect>'),
            frame("Compute local mean μ &amp; std σ",
                  f'<text x="160" y="90" text-anchor="middle" fill="{NEON["amber"]}" font-family="monospace" font-size="14">T = μ · (1 + k·(σ/R − 1))</text>'
                  f'<text x="160" y="120" text-anchor="middle" fill="{NEON["muted"]}" font-family="monospace" font-size="9">per-window adaptive threshold</text>'),
            frame("Threshold per window",
                  f'<rect x="60" y="40" width="100" height="120" fill="#000"/>'
                  f'<rect x="160" y="40" width="100" height="120" fill="#fff"/>'
                  f'<text x="80" y="180" fill="{NEON["cyan"]}" font-family="monospace" font-size="9">below T</text>'
                  f'<text x="180" y="180" fill="{NEON["pink"]}" font-family="monospace" font-size="9">above T</text>'),
            frame("Output · clean binary mask",
                  f'<rect x="60" y="40" width="200" height="120" fill="#fff"/>'
                  + "".join(f'<rect x="{80+(i%8)*22}" y="{60+(i//8)*22}" width="14" height="4" fill="#000"/>' for i in range(24))),
        ],
    },
    "otsu": {
        "name": "Otsu Threshold",
        "family": "preprocess",
        "frames": [
            frame("Input · grayscale histogram",
                  f'<g fill="{NEON["cyan"]}" opacity="0.7">'
                  + "".join(f'<rect x="{60+i*7}" y="{160-abs(int((i-14)*(i-14)*0.6))}" width="6" height="{abs(int((i-14)*(i-14)*0.6))}"/>' for i in range(28)) + '</g>'),
            frame("Search all thresholds t ∈ [0,255]",
                  f'<line x1="60" y1="40" x2="60" y2="170" stroke="{NEON["pink"]}" stroke-width="2">'
                  f'<animate attributeName="x1" values="60;260;60" dur="2s" repeatCount="indefinite"/>'
                  f'<animate attributeName="x2" values="60;260;60" dur="2s" repeatCount="indefinite"/></line>'),
            frame("Maximize inter-class variance σ²b",
                  f'<text x="160" y="90" text-anchor="middle" fill="{NEON["amber"]}" font-family="monospace" font-size="14">argmax σ²b(t)</text>'
                  f'<text x="160" y="115" text-anchor="middle" fill="{NEON["muted"]}" font-family="monospace" font-size="9">separate foreground / background</text>'),
            frame("Optimal t* found",
                  f'<line x1="170" y1="40" x2="170" y2="170" stroke="{NEON["cyan"]}" stroke-width="2"/>'
                  f'<text x="180" y="60" fill="{NEON["cyan"]}" font-family="monospace" font-size="10">t*</text>'),
            frame("Output · binary image",
                  f'<rect x="60" y="40" width="200" height="120" fill="#fff"/>'
                  f'<text x="160" y="105" text-anchor="middle" fill="#000" font-family="monospace" font-size="24" font-weight="bold">TEXT</text>'),
        ],
    },
    "dbnet": {
        "name": "DBNet",
        "full_name": "Differentiable Binarization Network",
        "family": "detection",
        "frames": [
            frame("Input document image",
                  f'<rect x="60" y="40" width="200" height="120" fill="#1a1a24"/>'
                  + "".join(f'<rect x="{75+(i%6)*32}" y="{55+(i//6)*20}" width="26" height="4" fill="#dddddd"/>' for i in range(18))),
            frame("Backbone (ResNet-50 + FPN) → feature map",
                  f'<g fill="none" stroke="{NEON["cyan"]}" stroke-width="1">'
                  + "".join(f'<rect x="{60+i*40}" y="{60+i*15}" width="{200-i*40}" height="{120-i*30}"/>' for i in range(3)) + '</g>'),
            frame("Probability map P + threshold map T",
                  f'<g><rect x="60" y="60" width="90" height="100" fill="{NEON["cyan"]}" opacity="0.4"/>'
                  f'<rect x="170" y="60" width="90" height="100" fill="{NEON["amber"]}" opacity="0.4"/>'
                  f'<text x="105" y="115" text-anchor="middle" fill="#fff" font-family="monospace" font-size="9">P (prob)</text>'
                  f'<text x="215" y="115" text-anchor="middle" fill="#fff" font-family="monospace" font-size="9">T (thresh)</text></g>'),
            frame("Differentiable binarization: B = σ(k(P−T))",
                  f'<text x="160" y="100" text-anchor="middle" fill="{NEON["pink"]}" font-family="monospace" font-size="16">B = σ(k(P − T))</text>'
                  f'<text x="160" y="125" text-anchor="middle" fill="{NEON["muted"]}" font-family="monospace" font-size="9">learnable · gradient-friendly</text>'),
            frame("Output · polygonal text regions",
                  f'<rect x="60" y="40" width="200" height="120" fill="#1a1a24"/>'
                  + "".join(f'<rect x="{75+(i%6)*32}" y="{53+(i//6)*20}" width="26" height="8" fill="none" stroke="{NEON["cyan"]}" stroke-width="1.5"/>' for i in range(18))),
        ],
    },
    "crnn": {
        "name": "CRNN",
        "full_name": "Convolutional Recurrent Neural Network",
        "family": "recognition",
        "frames": [
            frame("Input · cropped text line",
                  f'<rect x="60" y="80" width="200" height="40" fill="#fff"/>'
                  f'<text x="160" y="107" text-anchor="middle" fill="#000" font-family="monospace" font-size="20" font-weight="bold">AERWOLF</text>'),
            frame("CNN extracts feature sequence",
                  f'<g fill="none" stroke="{NEON["cyan"]}" stroke-width="1">'
                  + "".join(f'<rect x="{60+i*25}" y="60" width="25" height="80"/>' for i in range(8)) + '</g>'
                  f'<text x="160" y="175" text-anchor="middle" fill="{NEON["muted"]}" font-family="monospace" font-size="9">sequence of feature vectors</text>'),
            frame("BiLSTM reads left→right & right→left",
                  f'<g stroke="{NEON["amber"]}" stroke-width="1.5" fill="none">'
                  f'<path d="M60 80 Q160 40 260 80" marker-end="url(#a1)"/>'
                  f'<path d="M260 130 Q160 170 60 130" marker-end="url(#a2)"/></g>'
                  f'<defs><marker id="a1" viewBox="0 0 6 6" refX="6" refY="3" markerWidth="6" markerHeight="6"><path d="M0 0L6 3L0 6z" fill="{NEON["amber"]}"/></marker>'
                  f'<marker id="a2" viewBox="0 0 6 6" refX="6" refY="3" markerWidth="6" markerHeight="6"><path d="M0 0L6 3L0 6z" fill="{NEON["amber"]}"/></marker></defs>'),
            frame("Per-timestep character probabilities",
                  f'<g fill="{NEON["cyan"]}" font-family="monospace" font-size="14">'
                  + "".join(f'<text x="{75+i*25}" y="105" text-anchor="middle">{c}</text>' for i, c in enumerate("A E R W O L F")) + '</g>'),
            frame("CTC decoding · dedupe blanks",
                  f'<text x="160" y="90" text-anchor="middle" fill="{NEON["muted"]}" font-family="monospace" font-size="10">A-E-R-W-O-L-F-_</text>'
                  f'<text x="160" y="130" text-anchor="middle" fill="{NEON["cyan"]}" font-family="monospace" font-size="22" font-weight="bold">AERWOLF</text>'),
        ],
    },
    "svtr": {
        "name": "SVTR",
        "full_name": "Scene Text Recognition Transformer",
        "family": "recognition",
        "frames": [
            frame("Cropped text image", f'<rect x="60" y="80" width="200" height="40" fill="#fff"/><text x="160" y="107" text-anchor="middle" fill="#000" font-family="monospace" font-size="18" font-weight="bold">SVTR</text>'),
            frame("Split into patches", f'<g fill="none" stroke="{NEON["cyan"]}">' + "".join(f'<rect x="{60+i*25}" y="80" width="25" height="40"/>' for i in range(8)) + '</g>'),
            frame("Local + Global mixing blocks", f'<g fill="{NEON["amber"]}" opacity="0.6">' + "".join(f'<circle cx="{80+i*25}" cy="100" r="6"/>' for i in range(8)) + '</g><g stroke="{NEON["cyan"]}" opacity="0.4">' + "".join(f'<line x1="{80+i*25}" y1="100" x2="{80+((i+1)%8)*25}" y2="100"/>' for i in range(8)) + '</g>'),
            frame("Attention over full sequence", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["pink"]}" font-family="monospace" font-size="14">Q·Kᵀ / √d</text>'),
            frame("Output · decoded string", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["cyan"]}" font-family="monospace" font-size="22" font-weight="bold">SVTR</text>'),
        ],
    },
    "vit": {
        "name": "ViT",
        "full_name": "Vision Transformer",
        "family": "recognition",
        "frames": [
            frame("Input image", f'<rect x="80" y="40" width="160" height="120" fill="url(#img)"/><defs><linearGradient id="img" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#333"/><stop offset="1" stop-color="#888"/></linearGradient></defs>'),
            frame("Split into 16×16 patches", f'<g fill="none" stroke="{NEON["cyan"]}" opacity="0.8">' + "".join(f'<rect x="{80+i*20}" y="{40+j*20}" width="20" height="20"/>' for i in range(8) for j in range(6)) + '</g>'),
            frame("Flatten + linear embed + [CLS] + pos", f'<g fill="{NEON["amber"]}" opacity="0.7">' + "".join(f'<circle cx="{60+i*25}" cy="180" r="5"/>' for i in range(9)) + '</g><text x="60" y="195" fill="{NEON["pink"]}" font-family="monospace" font-size="9">CLS</text>'),
            frame("Multi-head self-attention × L layers", f'<g stroke="{NEON["cyan"]}" opacity="0.5">' + "".join(f'<line x1="{60+i*25}" y1="180" x2="{60+j*25}" y2="180"/>' for i in range(9) for j in range(9) if i != j) + '</g>'),
            frame("[CLS] head → class scores", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["cyan"]}" font-family="monospace" font-size="16">softmax([CLS])</text><text x="160" y="130" text-anchor="middle" fill="{NEON["amber"]}" font-family="monospace" font-size="11">→ class = 42</text>'),
        ],
    },
    "resnet": {
        "name": "ResNet",
        "family": "backbone",
        "frames": [
            frame("Input feature map", f'<rect x="60" y="60" width="80" height="80" fill="{NEON["cyan"]}" opacity="0.3"/><text x="100" y="105" text-anchor="middle" fill="#fff" font-family="monospace" font-size="10">x</text>'),
            frame("Conv → BN → ReLU → Conv → BN", f'<g fill="none" stroke="{NEON["amber"]}">' + "".join(f'<rect x="{140+i*20}" y="{70+i*4}" width="20" height="{80-i*8}"/>' for i in range(4)) + '</g>'),
            frame("Skip connection (identity)", f'<path d="M100 100 Q180 40 240 100" stroke="{NEON["pink"]}" stroke-width="2" fill="none" marker-end="url(#ar)"/><defs><marker id="ar" viewBox="0 0 6 6" refX="6" refY="3" markerWidth="6" markerHeight="6"><path d="M0 0L6 3L0 6z" fill="{NEON["pink"]}"/></marker></defs>'),
            frame("y = F(x) + x", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["cyan"]}" font-family="monospace" font-size="20">y = F(x) + x</text>'),
            frame("Gradient flows through identity ✓", f'<text x="160" y="90" text-anchor="middle" fill="{NEON["amber"]}" font-family="monospace" font-size="11">∂L/∂x = ∂L/∂y · (1 + ∂F/∂x)</text><text x="160" y="130" text-anchor="middle" fill="{NEON["muted"]}" font-family="monospace" font-size="9">no vanishing gradient</text>'),
        ],
    },
    "yolo": {
        "name": "YOLO",
        "family": "detection",
        "frames": [
            frame("Input image", f'<rect x="60" y="40" width="200" height="120" fill="#1a1a24"/><circle cx="120" cy="90" r="20" fill="{NEON["amber"]}"/><rect x="180" y="100" width="40" height="40" fill="{NEON["cyan"]}"/>'),
            frame("Divide into S×S grid", f'<g stroke="{NEON["cyan"]}" opacity="0.5" fill="none">' + "".join(f'<rect x="{60+i*40}" y="{40+j*40}" width="40" height="40"/>' for i in range(5) for j in range(3)) + '</g>'),
            frame("Each cell predicts B boxes + class", f'<g fill="none" stroke="{NEON["pink"]}" stroke-width="1.5"><rect x="100" y="70" width="40" height="40"/><rect x="175" y="95" width="50" height="50"/></g>'),
            frame("Confidence × class probabilities", f'<text x="160" y="90" text-anchor="middle" fill="{NEON["amber"]}" font-family="monospace" font-size="12">conf = Pr(obj) · IOU</text>'),
            frame("Non-max suppression → final boxes", f'<g fill="none"><rect x="100" y="70" width="40" height="40" stroke="{NEON["cyan"]}" stroke-width="2"/><rect x="175" y="95" width="50" height="50" stroke="{NEON["amber"]}" stroke-width="2"/></g><text x="120" y="65" fill="{NEON["cyan"]}" font-family="monospace" font-size="9">ball 0.94</text><text x="200" y="90" fill="{NEON["amber"]}" font-family="monospace" font-size="9">box 0.88</text>'),
        ],
    },
    "unet": {
        "name": "U-Net",
        "family": "segmentation",
        "frames": [
            frame("Input", f'<rect x="120" y="60" width="80" height="80" fill="{NEON["cyan"]}" opacity="0.4"/>'),
            frame("Contracting path (downsample)", f'<g fill="{NEON["cyan"]}" opacity="0.5">' + "".join(f'<rect x="{120-i*10}" y="{60+i*10}" width="{80-i*20}" height="{80-i*20}"/>' for i in range(4)) + '</g>'),
            frame("Bottleneck", f'<rect x="140" y="90" width="40" height="20" fill="{NEON["pink"]}"/>'),
            frame("Expanding path + skip connections", f'<g fill="{NEON["amber"]}" opacity="0.5">' + "".join(f'<rect x="{200-i*10}" y="{60+i*10}" width="{80-i*20}" height="{80-i*20}"/>' for i in range(4)) + '</g><g stroke="{NEON["cyan"]}" stroke-dasharray="3 3">' + "".join(f'<line x1="{120-i*10+80-i*20}" y1="{60+i*10}" x2="{200-i*10}" y2="{60+i*10}"/>' for i in range(3)) + '</g>'),
            frame("Output · pixel-wise segmentation", f'<rect x="120" y="60" width="80" height="80" fill="{NEON["amber"]}" opacity="0.7"/><text x="160" y="105" text-anchor="middle" fill="#000" font-family="monospace" font-size="10">mask</text>'),
        ],
    },
    # ------- LLM / generic ML -------
    "attention": {
        "name": "Attention",
        "family": "core",
        "frames": [
            frame("Input tokens x₁..xₙ", f'<g fill="{NEON["cyan"]}">' + "".join(f'<circle cx="{60+i*40}" cy="100" r="10"/>' for i in range(6)) + '</g>'),
            frame("Project to Q, K, V", f'<g font-family="monospace" font-size="14"><text x="80" y="105" fill="{NEON["cyan"]}">Q</text><text x="150" y="105" fill="{NEON["amber"]}">K</text><text x="220" y="105" fill="{NEON["pink"]}">V</text></g>'),
            frame("Score = Q · Kᵀ / √d", f'<text x="160" y="90" text-anchor="middle" fill="{NEON["amber"]}" font-family="monospace" font-size="16">Q · Kᵀ / √dₖ</text>'),
            frame("Softmax → attention weights", f'<g fill="{NEON["cyan"]}" opacity="0.4">' + "".join(f'<rect x="{60+i*40}" y="{140-((i*17)%50)}" width="20" height="{((i*17)%50)+10}"/>' for i in range(6)) + '</g>'),
            frame("Output = weights × V", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["cyan"]}" font-family="monospace" font-size="16">Attn(Q,K,V) = softmax(QKᵀ/√d)V</text>'),
        ],
    },
    "transformer": {
        "name": "Transformer",
        "family": "core",
        "frames": [
            frame("Input embeddings + positional", f'<g fill="{NEON["cyan"]}">' + "".join(f'<rect x="{60+i*35}" y="90" width="30" height="20"/>' for i in range(6)) + '</g>'),
            frame("Multi-head self-attention", f'<g stroke="{NEON["amber"]}" opacity="0.6">' + "".join(f'<line x1="{75+i*35}" y1="110" x2="{75+j*35}" y2="110"/>' for i in range(6) for j in range(6)) + '</g>'),
            frame("Add + LayerNorm", f'<text x="160" y="95" text-anchor="middle" fill="{NEON["pink"]}" font-family="monospace" font-size="13">x + Attn(x) → LN</text>'),
            frame("Feed-forward network", f'<g fill="none" stroke="{NEON["cyan"]}">' + "".join(f'<rect x="{60+i*35}" y="80" width="30" height="40"/>' for i in range(6)) + '</g>'),
            frame("Stack N blocks → output", f'<g fill="{NEON["amber"]}" opacity="0.6">' + "".join(f'<rect x="{100}" y="{40+i*15}" width="120" height="10"/>' for i in range(8)) + '</g><text x="160" y="180" text-anchor="middle" fill="{NEON["muted"]}" font-family="monospace" font-size="9">N × Transformer blocks</text>'),
        ],
    },
    "diffusion": {
        "name": "Diffusion",
        "family": "generative",
        "frames": [
            frame("Pure noise x_T", f'<g fill="{NEON["muted"]}">' + "".join(f'<rect x="{60+(i%20)*10}" y="{40+(i//20)*10}" width="10" height="10" opacity="{0.3+(i%7)*0.1}"/>' for i in range(240)) + '</g>'),
            frame("Predict noise ε_θ(x_t, t)", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["pink"]}" font-family="monospace" font-size="14">ε_θ(x_t, t)</text>'),
            frame("Denoise one step: x_{t-1}", f'<g fill="{NEON["cyan"]}" opacity="0.6">' + "".join(f'<rect x="{60+(i%20)*10}" y="{40+(i//20)*10}" width="10" height="10" opacity="{0.3+((i*3)%7)*0.1}"/>' for i in range(240)) + '</g>'),
            frame("Repeat T→0 (or 1-step distilled)", f'<g fill="{NEON["cyan"]}"><rect x="80" y="60" width="160" height="80" opacity="0.9"/></g><text x="160" y="105" text-anchor="middle" fill="#000" font-family="monospace" font-size="10">clean image</text>'),
            frame("Output · sample x₀", f'<circle cx="160" cy="100" r="45" fill="{NEON["cyan"]}"/><text x="160" y="105" text-anchor="middle" fill="#000" font-family="monospace" font-size="12" font-weight="bold">x₀</text>'),
        ],
    },
    "rag": {
        "name": "RAG",
        "full_name": "Retrieval-Augmented Generation",
        "family": "llm-pipeline",
        "frames": [
            frame("Query · user question", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["cyan"]}" font-family="monospace" font-size="12">"How does DBNet work?"</text>'),
            frame("Embed query → vector", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["amber"]}" font-family="monospace" font-size="12">embed(q) → v ∈ ℝ^d</text>'),
            frame("k-NN search in vector DB", f'<g fill="{NEON["cyan"]}" opacity="0.5">' + "".join(f'<circle cx="{60+(i%8)*25}" cy="{50+(i//8)*20}" r="4"/>' for i in range(24)) + '</g><circle cx="160" cy="100" r="30" fill="none" stroke="{NEON["pink"]}" stroke-dasharray="4 2"/>'),
            frame("Retrieve top-k passages", f'<g fill="none" stroke="{NEON["amber"]}">' + "".join(f'<rect x="60" y="{45+i*30}" width="200" height="24"/>' for i in range(4)) + '</g>'),
            frame("LLM(query + context) → answer", f'<text x="160" y="90" text-anchor="middle" fill="{NEON["pink"]}" font-family="monospace" font-size="12">LLM(q ⊕ ctx)</text><text x="160" y="120" text-anchor="middle" fill="{NEON["cyan"]}" font-family="monospace" font-size="12">→ grounded answer</text>'),
        ],
    },
    "lstm": {
        "name": "LSTM",
        "family": "sequence",
        "frames": [
            frame("Input xₜ + hidden hₜ₋₁", f'<g fill="{NEON["cyan"]}"><circle cx="80" cy="100" r="10"/><circle cx="80" cy="140" r="10"/></g><text x="80" y="65" text-anchor="middle" fill="#fff" font-family="monospace" font-size="9">xₜ</text><text x="80" y="170" text-anchor="middle" fill="#fff" font-family="monospace" font-size="9">hₜ₋₁</text>'),
            frame("Forget gate · fₜ = σ(Wf[hₜ₋₁, xₜ])", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["pink"]}" font-family="monospace" font-size="13">fₜ ← forget</text>'),
            frame("Input gate · iₜ &amp; C̃ₜ", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["amber"]}" font-family="monospace" font-size="13">iₜ ← write</text>'),
            frame("Cell update · Cₜ = fₜ·Cₜ₋₁ + iₜ·C̃ₜ", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["cyan"]}" font-family="monospace" font-size="12">Cₜ = fₜCₜ₋₁ + iₜC̃ₜ</text>'),
            frame("Output gate · hₜ", f'<circle cx="240" cy="100" r="12" fill="{NEON["cyan"]}"/><text x="240" y="105" text-anchor="middle" fill="#000" font-family="monospace" font-size="10">hₜ</text>'),
        ],
    },
    "cnn": {
        "name": "CNN",
        "family": "backbone",
        "frames": [
            frame("Input image", f'<rect x="60" y="50" width="100" height="100" fill="{NEON["cyan"]}" opacity="0.4"/>'),
            frame("Convolution · kernel slides", f'<rect x="60" y="50" width="100" height="100" fill="{NEON["cyan"]}" opacity="0.2"/><rect x="90" y="80" width="30" height="30" fill="none" stroke="{NEON["pink"]}" stroke-width="2"><animate attributeName="x" values="60;130;60" dur="2s" repeatCount="indefinite"/></rect>'),
            frame("ReLU · max(0, x)", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["amber"]}" font-family="monospace" font-size="14">max(0, x)</text>'),
            frame("Max-pool · 2×2", f'<g fill="none" stroke="{NEON["cyan"]}">' + "".join(f'<rect x="{180+i*15}" y="{60+j*15}" width="15" height="15"/>' for i in range(4) for j in range(4)) + '</g>'),
            frame("Repeat → FC → softmax", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["cyan"]}" font-family="monospace" font-size="14">softmax → class</text>'),
        ],
    },
    "gan": {
        "name": "GAN",
        "family": "generative",
        "frames": [
            frame("Noise z ~ N(0, I)", f'<g fill="{NEON["muted"]}">' + "".join(f'<circle cx="{80+i*25}" cy="100" r="4"/>' for i in range(6)) + '</g>'),
            frame("Generator G(z) → fake", f'<rect x="120" y="60" width="80" height="80" fill="{NEON["amber"]}" opacity="0.4"/><text x="160" y="105" text-anchor="middle" fill="#fff" font-family="monospace" font-size="10">G(z)</text>'),
            frame("Discriminator D judges real vs fake", f'<circle cx="240" cy="100" r="20" fill="none" stroke="{NEON["pink"]}" stroke-width="2"/><text x="240" y="105" text-anchor="middle" fill="{NEON["pink"]}" font-family="monospace" font-size="10">D</text>'),
            frame("min_G max_D · adversarial loss", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["cyan"]}" font-family="monospace" font-size="12">min_G max_D V(G, D)</text>'),
            frame("Equilibrium · G fools D", f'<rect x="120" y="60" width="80" height="80" fill="{NEON["cyan"]}"/><text x="160" y="105" text-anchor="middle" fill="#000" font-family="monospace" font-size="10">realistic</text>'),
        ],
    },
    "kmeans": {
        "name": "K-means",
        "family": "clustering",
        "frames": [
            frame("Points in 2D space", f'<g fill="{NEON["cyan"]}">' + "".join(f'<circle cx="{80+(i*37)%180}" cy="{60+(i*53)%80}" r="3"/>' for i in range(30)) + '</g>'),
            frame("Init k centroids randomly", f'<g fill="{NEON["cyan"]}">' + "".join(f'<circle cx="{80+(i*37)%180}" cy="{60+(i*53)%80}" r="3"/>' for i in range(30)) + '</g><g fill="{NEON["pink"]}"><circle cx="120" cy="80" r="7"/><circle cx="200" cy="120" r="7"/><circle cx="150" cy="140" r="7"/></g>'),
            frame("Assign each point to nearest centroid", f'<g><circle cx="120" cy="80" r="30" fill="{NEON["pink"]}" opacity="0.1"/><circle cx="200" cy="120" r="30" fill="{NEON["amber"]}" opacity="0.1"/><circle cx="150" cy="140" r="30" fill="{NEON["cyan"]}" opacity="0.1"/></g>'),
            frame("Recompute centroid = mean(cluster)", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["amber"]}" font-family="monospace" font-size="12">μₖ ← mean(Cₖ)</text>'),
            frame("Repeat until convergence", f'<g fill="{NEON["pink"]}"><circle cx="105" cy="75" r="10"/></g><g fill="{NEON["amber"]}"><circle cx="210" cy="115" r="10"/></g><g fill="{NEON["cyan"]}"><circle cx="145" cy="145" r="10"/></g>'),
        ],
    },
    "pca": {
        "name": "PCA",
        "family": "dim-reduce",
        "frames": [
            frame("Data cloud in ℝⁿ", f'<g fill="{NEON["cyan"]}" opacity="0.6">' + "".join(f'<circle cx="{110+(i*23)%100}" cy="{60+(i*17)%80}" r="3"/>' for i in range(24)) + '</g>'),
            frame("Center · subtract mean", f'<g fill="{NEON["cyan"]}">' + "".join(f'<circle cx="{160+((i*23)%100)-50}" cy="{100+((i*17)%80)-40}" r="3"/>' for i in range(24)) + '</g>'),
            frame("Covariance matrix · Σ = XᵀX/n", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["amber"]}" font-family="monospace" font-size="14">Σ = XᵀX / n</text>'),
            frame("Eigendecomposition → principal axes", f'<line x1="60" y1="150" x2="260" y2="50" stroke="{NEON["pink"]}" stroke-width="2"/><line x1="100" y1="40" x2="220" y2="160" stroke="{NEON["amber"]}" stroke-width="2"/>'),
            frame("Project onto top-k eigenvectors", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["cyan"]}" font-family="monospace" font-size="14">Z = X · Vₖ</text>'),
        ],
    },
    "tsne": {
        "name": "t-SNE",
        "family": "dim-reduce",
        "frames": [
            frame("High-dim data", f'<g fill="{NEON["cyan"]}" opacity="0.6">' + "".join(f'<circle cx="{80+(i*23)%180}" cy="{50+(i*17)%100}" r="3"/>' for i in range(40)) + '</g>'),
            frame("Compute similarities p_{ij} (Gaussian)", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["amber"]}" font-family="monospace" font-size="12">p_{{ij}} ∝ exp(−||xᵢ−xⱼ||²)</text>'),
            frame("Low-dim similarities q_{ij} (Student-t)", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["pink"]}" font-family="monospace" font-size="12">q_{{ij}} ∝ (1 + ||yᵢ−yⱼ||²)⁻¹</text>'),
            frame("Minimize KL(P || Q)", f'<text x="160" y="105" text-anchor="middle" fill="{NEON["cyan"]}" font-family="monospace" font-size="14">KL(P || Q)</text>'),
            frame("Output · 2D embedding with clusters",
                  f'<g fill="{NEON["cyan"]}"><circle cx="90" cy="70" r="3"/><circle cx="100" cy="80" r="3"/><circle cx="85" cy="75" r="3"/></g>'
                  f'<g fill="{NEON["amber"]}"><circle cx="220" cy="130" r="3"/><circle cx="230" cy="120" r="3"/><circle cx="225" cy="140" r="3"/></g>'
                  f'<g fill="{NEON["pink"]}"><circle cx="160" cy="100" r="3"/><circle cx="170" cy="110" r="3"/><circle cx="155" cy="95" r="3"/></g>'),
        ],
    },
}


def get_seeded(algorithm_key: str):
    """Return hyperframe entry for a normalised key, or None. Word-token match (no substring collisions)."""
    raw = (algorithm_key or "").lower().strip()
    key = raw.replace(" ", "_").replace("-", "_")
    if key in HYPERFRAMES:
        return HYPERFRAMES[key]
    aliases = {
        "contrast_limited_adaptive_histogram_equalization": "clahe",
        "sauvola_binarization": "sauvola",
        "otsu_threshold": "otsu", "otsu_thresholding": "otsu", "otsus_method": "otsu",
        "differentiable_binarization_network": "dbnet", "differentiable_binarization": "dbnet",
        "convolutional_recurrent_neural_network": "crnn",
        "scene_text_recognition_transformer": "svtr",
        "vision_transformer": "vit",
        "you_only_look_once": "yolo",
        "u_net": "unet", "unet_segmentation": "unet",
        "retrieval_augmented_generation": "rag",
        "long_short_term_memory": "lstm",
        "convolutional_neural_network": "cnn",
        "generative_adversarial_network": "gan",
        "k_means_clustering": "kmeans", "kmeans_clustering": "kmeans", "k_means": "kmeans",
        "principal_component_analysis": "pca",
        "t_sne": "tsne", "t_distributed_stochastic_neighbor_embedding": "tsne", "tsne": "tsne",
        "one_step_diffusion": "diffusion", "denoising_diffusion": "diffusion", "diffusion_model": "diffusion",
        "self_attention": "attention", "multi_head_attention": "attention", "scaled_dot_product_attention": "attention",
    }
    if key in aliases:
        return HYPERFRAMES[aliases[key]]
    # word-token match (no substring collisions)
    import re as _re
    tokens = set(_re.findall(r"[a-z0-9]+", raw))
    for hkey, entry in HYPERFRAMES.items():
        if hkey in tokens or entry["name"].lower() in tokens:
            return entry
    for alias, target in aliases.items():
        alias_tokens = set(alias.split("_"))
        if alias_tokens and alias_tokens.issubset(tokens):
            return HYPERFRAMES[target]
    return None


def list_seeded() -> list:
    return [{"key": k, "name": v["name"], "family": v["family"]} for k, v in HYPERFRAMES.items()]
