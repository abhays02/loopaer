"""
Curated interactive-explainer references per algorithm.
Distill.pub has amazing interactive articles for many ML topics but the site
went on hiatus in 2021 — we link out (open in new tab) and, where the article
allows iframe embedding, we surface an inline "embed" URL too.
Fallbacks: d2l.ai (Dive into Deep Learning), colah.github.io, jalammar.github.io,
seeing-theory, Setosa/e.
"""

# key MUST match hyperframes.HYPERFRAMES keys / aliases
REFERENCES = {
    "clahe": [
        {"title": "OpenCV · Histogram Equalization tutorial", "url": "https://docs.opencv.org/master/d5/daf/tutorial_py_histogram_equalization.html", "source": "OpenCV", "type": "docs", "iframe": False},
        {"title": "scikit-image · CLAHE reference", "url": "https://scikit-image.org/docs/stable/auto_examples/color_exposure/plot_local_equalize.html", "source": "scikit-image", "type": "docs", "iframe": False},
    ],
    "sauvola": [
        {"title": "scikit-image · Sauvola thresholding demo", "url": "https://scikit-image.org/docs/stable/auto_examples/segmentation/plot_niblack_sauvola.html", "source": "scikit-image", "type": "docs", "iframe": False},
    ],
    "otsu": [
        {"title": "Otsu's method · scikit-image", "url": "https://scikit-image.org/docs/stable/auto_examples/segmentation/plot_thresholding.html", "source": "scikit-image", "type": "docs", "iframe": False},
    ],
    "dbnet": [
        {"title": "DBNet paper (arXiv 1911.08947)", "url": "https://arxiv.org/abs/1911.08947", "source": "arXiv", "type": "paper", "iframe": False},
        {"title": "PaddleOCR · DBNet implementation guide", "url": "https://github.com/PaddlePaddle/PaddleOCR/blob/main/doc/doc_en/algorithm_det_db_en.md", "source": "PaddleOCR", "type": "impl", "iframe": False},
    ],
    "crnn": [
        {"title": "CRNN paper (arXiv 1507.05717)", "url": "https://arxiv.org/abs/1507.05717", "source": "arXiv", "type": "paper", "iframe": False},
        {"title": "distill.pub · Handwriting with Recurrent Networks", "url": "https://distill.pub/2016/handwriting/", "source": "distill.pub", "type": "distill", "iframe": True},
    ],
    "svtr": [
        {"title": "SVTR paper (arXiv 2205.00159)", "url": "https://arxiv.org/abs/2205.00159", "source": "arXiv", "type": "paper", "iframe": False},
    ],
    "vit": [
        {"title": "An Image is Worth 16×16 Words (arXiv 2010.11929)", "url": "https://arxiv.org/abs/2010.11929", "source": "arXiv", "type": "paper", "iframe": False},
        {"title": "distill.pub · Multimodal Neurons in ANN", "url": "https://distill.pub/2021/multimodal-neurons/", "source": "distill.pub", "type": "distill", "iframe": True},
    ],
    "resnet": [
        {"title": "ResNet paper (arXiv 1512.03385)", "url": "https://arxiv.org/abs/1512.03385", "source": "arXiv", "type": "paper", "iframe": False},
        {"title": "d2l.ai · Residual Networks (ResNet)", "url": "https://d2l.ai/chapter_convolutional-modern/resnet.html", "source": "d2l.ai", "type": "book", "iframe": True},
    ],
    "yolo": [
        {"title": "YOLO paper (arXiv 1506.02640)", "url": "https://arxiv.org/abs/1506.02640", "source": "arXiv", "type": "paper", "iframe": False},
        {"title": "d2l.ai · Object Detection", "url": "https://d2l.ai/chapter_computer-vision/anchor.html", "source": "d2l.ai", "type": "book", "iframe": True},
    ],
    "unet": [
        {"title": "U-Net paper (arXiv 1505.04597)", "url": "https://arxiv.org/abs/1505.04597", "source": "arXiv", "type": "paper", "iframe": False},
        {"title": "distill.pub · Deconvolution and Checkerboard Artifacts", "url": "https://distill.pub/2016/deconv-checkerboard/", "source": "distill.pub", "type": "distill", "iframe": True},
    ],
    "attention": [
        {"title": "distill.pub · Attention & Augmented RNNs", "url": "https://distill.pub/2016/augmented-rnns/", "source": "distill.pub", "type": "distill", "iframe": True},
        {"title": "Jay Alammar · The Illustrated Transformer", "url": "https://jalammar.github.io/illustrated-transformer/", "source": "jalammar.github.io", "type": "blog", "iframe": True},
        {"title": "Attention Is All You Need (arXiv 1706.03762)", "url": "https://arxiv.org/abs/1706.03762", "source": "arXiv", "type": "paper", "iframe": False},
    ],
    "transformer": [
        {"title": "Jay Alammar · The Illustrated Transformer", "url": "https://jalammar.github.io/illustrated-transformer/", "source": "jalammar.github.io", "type": "blog", "iframe": True},
        {"title": "Attention Is All You Need (arXiv 1706.03762)", "url": "https://arxiv.org/abs/1706.03762", "source": "arXiv", "type": "paper", "iframe": False},
        {"title": "distill.pub · A Visual Exploration of Gaussian Processes", "url": "https://distill.pub/2019/visual-exploration-gaussian-processes/", "source": "distill.pub", "type": "distill", "iframe": True},
    ],
    "diffusion": [
        {"title": "Lilian Weng · What are Diffusion Models?", "url": "https://lilianweng.github.io/posts/2021-07-11-diffusion-models/", "source": "lilianweng", "type": "blog", "iframe": True},
        {"title": "DDPM paper (arXiv 2006.11239)", "url": "https://arxiv.org/abs/2006.11239", "source": "arXiv", "type": "paper", "iframe": False},
    ],
    "rag": [
        {"title": "RAG paper (arXiv 2005.11401)", "url": "https://arxiv.org/abs/2005.11401", "source": "arXiv", "type": "paper", "iframe": False},
        {"title": "Pinecone · RAG guide", "url": "https://www.pinecone.io/learn/retrieval-augmented-generation/", "source": "pinecone.io", "type": "blog", "iframe": True},
    ],
    "lstm": [
        {"title": "Chris Olah · Understanding LSTM Networks", "url": "https://colah.github.io/posts/2015-08-Understanding-LSTMs/", "source": "colah.github.io", "type": "blog", "iframe": True},
        {"title": "distill.pub · Attention & Augmented RNNs", "url": "https://distill.pub/2016/augmented-rnns/", "source": "distill.pub", "type": "distill", "iframe": True},
    ],
    "cnn": [
        {"title": "distill.pub · Feature Visualization", "url": "https://distill.pub/2017/feature-visualization/", "source": "distill.pub", "type": "distill", "iframe": True},
        {"title": "distill.pub · Building Blocks of Interpretability", "url": "https://distill.pub/2018/building-blocks/", "source": "distill.pub", "type": "distill", "iframe": True},
        {"title": "d2l.ai · Convolutional Neural Networks", "url": "https://d2l.ai/chapter_convolutional-neural-networks/", "source": "d2l.ai", "type": "book", "iframe": True},
    ],
    "gan": [
        {"title": "GAN paper (arXiv 1406.2661)", "url": "https://arxiv.org/abs/1406.2661", "source": "arXiv", "type": "paper", "iframe": False},
        {"title": "distill.pub · GAN Lab (interactive)", "url": "https://poloclub.github.io/ganlab/", "source": "polo club", "type": "interactive", "iframe": True},
    ],
    "kmeans": [
        {"title": "Naftali Harris · Visualising K-Means", "url": "https://www.naftaliharris.com/blog/visualizing-k-means-clustering/", "source": "naftaliharris.com", "type": "interactive", "iframe": True},
        {"title": "Seeing Theory · Clustering", "url": "https://seeing-theory.brown.edu/", "source": "seeing-theory", "type": "interactive", "iframe": False},
    ],
    "pca": [
        {"title": "Setosa · PCA (interactive explanation)", "url": "https://setosa.io/ev/principal-component-analysis/", "source": "setosa.io", "type": "interactive", "iframe": True},
        {"title": "distill.pub · Visualising Representations", "url": "https://distill.pub/2016/misread-tsne/", "source": "distill.pub", "type": "distill", "iframe": True},
    ],
    "tsne": [
        {"title": "distill.pub · How to Use t-SNE Effectively", "url": "https://distill.pub/2016/misread-tsne/", "source": "distill.pub", "type": "distill", "iframe": True},
        {"title": "van der Maaten · t-SNE paper (JMLR 2008)", "url": "https://www.jmlr.org/papers/volume9/vandermaaten08a/vandermaaten08a.pdf", "source": "JMLR", "type": "paper", "iframe": False},
    ],
    # Generic fallback keyed to the "family"
    "_family_ocr": [
        {"title": "PaddleOCR docs", "url": "https://github.com/PaddlePaddle/PaddleOCR", "source": "PaddleOCR", "type": "impl", "iframe": False},
        {"title": "Awesome OCR", "url": "https://github.com/kba/awesome-ocr", "source": "GitHub", "type": "list", "iframe": False},
    ],
    "_family_llm": [
        {"title": "Jay Alammar · Illustrated Transformer", "url": "https://jalammar.github.io/illustrated-transformer/", "source": "jalammar.github.io", "type": "blog", "iframe": True},
        {"title": "distill.pub archive", "url": "https://distill.pub/", "source": "distill.pub", "type": "distill", "iframe": True},
    ],
    "_family_default": [
        {"title": "distill.pub archive", "url": "https://distill.pub/", "source": "distill.pub", "type": "distill", "iframe": True},
        {"title": "d2l.ai · Dive into Deep Learning", "url": "https://d2l.ai/", "source": "d2l.ai", "type": "book", "iframe": True},
    ],
}


def get_references(algorithm_key: str, topic: str = "") -> list:
    """Return curated reference links for an algorithm, with topic-family fallback."""
    from hyperframes import get_seeded
    raw = (algorithm_key or "").lower().strip()
    # Try exact key
    normalised = raw.replace(" ", "_").replace("-", "_")
    if normalised in REFERENCES:
        return REFERENCES[normalised]
    # Resolve via seeded lookup (fuzzy key mapping already handled there)
    seeded = get_seeded(algorithm_key)
    if seeded:
        # find which key of REFERENCES matches this seeded entry's name
        seeded_name_norm = seeded["name"].lower().replace(" ", "_").replace("-", "_")
        for rk in REFERENCES:
            if rk == seeded_name_norm or seeded_name_norm.startswith(rk):
                return REFERENCES[rk]
    # topic-family fallback
    topic_l = (topic or "").lower()
    if any(k in topic_l for k in ("ocr", "htr", "text", "handwriting")):
        return REFERENCES["_family_ocr"]
    if any(k in topic_l for k in ("llm", "language", "chat", "rag", "prompt")):
        return REFERENCES["_family_llm"]
    return REFERENCES["_family_default"]
