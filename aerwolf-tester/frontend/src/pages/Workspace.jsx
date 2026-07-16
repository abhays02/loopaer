import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ReactFlow, {
  Background, Controls, addEdge, useNodesState, useEdgesState, MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { MODELS } from "../lib/models";
import ArchNode from "../components/ArchNode";
import AlgorithmDrawer from "../components/AlgorithmDrawer";
import TechFinder from "../components/TechFinder";
import HyperframePlayer from "../components/HyperframePlayer";
import ComparePanel from "../components/ComparePanel";
import ResultsPanel from "../components/ResultsPanel";
import { Save, FileDown, Plus, Loader2, Sparkles } from "lucide-react";

// stable references — declared at module scope to prevent React Flow re-registration
const NODE_TYPES = Object.freeze({ arch: ArchNode });

const DEFAULT_NODES = [
  { id: "n_input", type: "arch", position: { x: 40, y: 100 }, data: { id: "n_input", label: "Input", type: "input" } },
  { id: "n_pre",   type: "arch", position: { x: 320, y: 100 }, data: { id: "n_pre", label: "Preprocess", type: "preprocess" } },
  { id: "n_det",   type: "arch", position: { x: 600, y: 100 }, data: { id: "n_det", label: "Detection", type: "detection" } },
  { id: "n_rec",   type: "arch", position: { x: 880, y: 100 }, data: { id: "n_rec", label: "Recognition", type: "recognition" } },
  { id: "n_post",  type: "arch", position: { x: 1160, y: 100 }, data: { id: "n_post", label: "Postprocess", type: "postprocess" } },
];
const DEFAULT_EDGES = [
  { id: "e1", source: "n_input", target: "n_pre", animated: true },
  { id: "e2", source: "n_pre", target: "n_det", animated: true },
  { id: "e3", source: "n_det", target: "n_rec", animated: true },
  { id: "e4", source: "n_rec", target: "n_post", animated: true },
];

const NODE_TYPE_OPTIONS = ["input", "preprocess", "detection", "recognition", "postprocess", "output", "custom"];

export default function Workspace() {
  const [sp, setSp] = useSearchParams();
  const topic = sp.get("topic") || "";
  const navigate = useNavigate();

  const [results, setResults] = useState(null);
  const [wisdom, setWisdom] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [loadingWisdom, setLoadingWisdom] = useState(false);
  const [modelIdx, setModelIdx] = useState(0);

  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_EDGES);

  // Hydrate seeded graph from Notebook → Compile-to-Canvas
  useEffect(() => {
    if (sp.get("seeded") === "1") {
      try {
        const raw = sessionStorage.getItem("aerwolf_seeded_graph");
        if (raw) {
          const g = JSON.parse(raw);
          if (Array.isArray(g.nodes) && g.nodes.length) {
            setNodes(g.nodes.map((n) => ({ id: n.id, type: "arch", position: n.position || { x: 0, y: 100 }, data: { id: n.id, label: n.label, type: n.type, algorithm: n.algorithm, tech: n.tech } })));
          }
          if (Array.isArray(g.edges) && g.edges.length) {
            setEdges(g.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, animated: true })));
          }
          if (g.name) setSkillName(g.name);
          sessionStorage.removeItem("aerwolf_seeded_graph");
        }
      } catch (e) { /* noop */ }
    }
  }, [sp, setNodes, setEdges]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [techFinderAlgo, setTechFinderAlgo] = useState(null);
  const [hyperAlgo, setHyperAlgo] = useState(null);
  const [compareItems, setCompareItems] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMd, setExportMd] = useState(null);
  const [skillName, setSkillName] = useState("");

  const onConnect = useCallback((params) => setEdges((es) => addEdge({ ...params, animated: true }, es)), [setEdges]);

  const model = MODELS[modelIdx];

  const runSearch = useCallback(async (t) => {
    if (!t) return;
    setLoadingResults(true);
    setLoadingWisdom(true);
    setWisdom(null);
    setResults(null);
    try {
      const r = await api.get(`/search`, { params: { topic: t } });
      setResults(r.data);
    } catch (e) { console.error(e); }
    finally { setLoadingResults(false); }
    try {
      const w = await api.post(`/wisdom`, { topic: t, provider: model.provider, model: model.model });
      setWisdom(w.data);
    } catch (e) { console.error(e); }
    finally { setLoadingWisdom(false); }
  }, [model.provider, model.model]);

  useEffect(() => {
    if (topic) {
      setSkillName(`${topic}-pipeline`);
      runSearch(topic);
    }
  }, [topic, runSearch]);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
    setDrawerOpen(true);
    // Mark node busy while drawer/LLM loads
    setNodes((ns) => ns.map((n) => n.id === node.id ? { ...n, data: { ...n.data, busy: true } } : n));
    // Clear busy after a reasonable window (drawer will finish loading algos ~5-15s)
    setTimeout(() => {
      setNodes((ns) => ns.map((n) => n.id === node.id ? { ...n, data: { ...n.data, busy: false } } : n));
    }, 16000);
  }, [setNodes]);

  const applyAlgorithm = useCallback((algo) => {
    if (!selectedNode) return;
    setNodes((ns) =>
      ns.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, algorithm: algo.name, tech: (algo.tech_stack || []).join(" · ") } }
          : n
      )
    );
    setDrawerOpen(false);
    setTechFinderAlgo(null);
  }, [selectedNode, setNodes]);

  const addNode = () => {
    const id = `n_${Math.random().toString(36).slice(2, 8)}`;
    const nx = 300 + Math.random() * 400;
    const ny = 300 + Math.random() * 200;
    setNodes((ns) => [...ns, { id, type: "arch", position: { x: nx, y: ny }, data: { id, label: "New Node", type: "custom" } }]);
  };

  const renameNode = (id, label, type) => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, label, type } } : n));
  };

  const buildSkillPayload = () => ({
    name: skillName || `${topic || "unnamed"}-pipeline`,
    topic,
    description: wisdom?.summary || `${topic} research pipeline`,
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.data.label,
      type: n.data.type,
      algorithm: n.data.algorithm || null,
      tech: n.data.tech || null,
      position: n.position,
    })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    tech_stack: nodes.filter((n) => n.data.algorithm).map((n) => ({ node: n.data.label, algorithm: n.data.algorithm, tech: n.data.tech })),
    version: "1.0.0",
  });

  const [savedId, setSavedId] = useState(null);

  const saveSkill = async () => {
    setSaving(true);
    try {
      let r;
      if (savedId) {
        r = await api.put(`/skills/${savedId}`, buildSkillPayload());
      } else {
        r = await api.post(`/skills`, buildSkillPayload());
        setSavedId(r.data.id);
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const exportSkill = async () => {
    setExporting(true);
    try {
      let id = savedId;
      if (!id) {
        const r = await api.post(`/skills`, buildSkillPayload());
        id = r.data.id;
        setSavedId(id);
      } else {
        await api.put(`/skills/${id}`, buildSkillPayload());
      }
      const r = await api.post(`/skills/export`, { skill_id: id, provider: model.provider, model: model.model });
      setExportMd(r.data);
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  const downloadMd = () => {
    if (!exportMd) return;
    const blob = new Blob([exportMd.skill_md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportMd.filename || "SKILL.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-white/10 bg-[#0D0D12]/70 backdrop-blur-md px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 z-20">
        <input
          data-testid="workspace-skill-name-input"
          value={skillName}
          onChange={(e) => setSkillName(e.target.value)}
          placeholder="skill name"
          className="bg-transparent border border-white/10 focus:border-[#00E5FF] outline-none text-xs font-mono px-3 py-2 min-w-[180px]"
        />
        <div className="text-[10px] tracking-[0.25em] uppercase text-white/40 hidden sm:block">
          topic · <span className="text-[#00E5FF]">{topic || "—"}</span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            data-testid="model-select"
            value={modelIdx}
            onChange={(e) => setModelIdx(parseInt(e.target.value))}
            className="bg-[#0D0D12] border border-white/15 text-[11px] font-mono px-3 py-2 focus:border-[#00E5FF] outline-none"
          >
            {MODELS.map((m, i) => <option key={i} value={i}>{m.label}</option>)}
          </select>
          <button
            data-testid="workspace-add-node-btn"
            onClick={addNode}
            className="flex items-center gap-1.5 border border-white/15 text-white/80 px-3 py-2 text-[11px] uppercase tracking-widest font-bold hover:border-[#00E5FF] hover:text-[#00E5FF] transition-colors"
          >
            <Plus size={12} /> Node
          </button>
          <button
            data-testid="workspace-save-btn"
            onClick={saveSkill}
            disabled={saving}
            className="flex items-center gap-1.5 border border-[#FFB000]/40 text-[#FFB000] px-3 py-2 text-[11px] uppercase tracking-widest font-bold hover:bg-[#FFB000]/10 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
          </button>
          <button
            data-testid="workspace-export-btn"
            onClick={exportSkill}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-[#00E5FF] text-black px-3 py-2 text-[11px] uppercase tracking-widest font-black hover:bg-white transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />} Export SKILL.md
          </button>
        </div>
      </div>

      {/* Main layout: canvas + right panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative" data-testid="workspace-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={NODE_TYPES}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#00E5FF22" gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={() => "#00E5FF"}
              maskColor="rgba(6,6,8,0.85)"
              style={{ background: "#0D0D12", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </ReactFlow>
          {selectedNode && (
            <NodeEditor
              node={selectedNode}
              onRename={renameNode}
              onOpenDrawer={() => setDrawerOpen(true)}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </div>

        {/* Right rail: Results + wisdom */}
        <div className="hidden lg:block w-[420px] shrink-0 border-l border-white/10 bg-[#060608]/95 overflow-y-auto">
          <ResultsPanel results={results} wisdom={wisdom} loadingResults={loadingResults} loadingWisdom={loadingWisdom} topic={topic} />
        </div>
      </div>

      {/* Algorithm Drawer (Stage 1) */}
      <AnimatePresence>
        {drawerOpen && selectedNode && !techFinderAlgo && (
          <AlgorithmDrawer
            key="drawer"
            node={selectedNode}
            topic={topic}
            provider={model.provider}
            model={model.model}
            onClose={() => setDrawerOpen(false)}
            onGoTech={(algo) => setTechFinderAlgo(algo)}
            onWatch={(algo) => setHyperAlgo(algo)}
            onCompare={(names) => setCompareItems(names)}
          />
        )}
      </AnimatePresence>

      {/* TechFinder (Stage 2) */}
      <AnimatePresence>
        {techFinderAlgo && selectedNode && (
          <TechFinder
            algorithm={techFinderAlgo}
            topic={topic}
            provider={model.provider}
            model={model.model}
            onBack={() => setTechFinderAlgo(null)}
            onClose={() => { setTechFinderAlgo(null); setDrawerOpen(false); }}
            onApply={applyAlgorithm}
          />
        )}
      </AnimatePresence>

      {/* Hyperframe player */}
      <AnimatePresence>
        {hyperAlgo && (
          <HyperframePlayer
            algorithm={hyperAlgo.name}
            topic={topic}
            provider={model.provider}
            model={model.model}
            onClose={() => setHyperAlgo(null)}
          />
        )}
      </AnimatePresence>

      {/* Compare panel */}
      <AnimatePresence>
        {compareItems && (
          <ComparePanel
            items={compareItems}
            topic={topic}
            provider={model.provider}
            model={model.model}
            onClose={() => setCompareItems(null)}
          />
        )}
      </AnimatePresence>

      {/* Export preview modal */}
      <AnimatePresence>
        {exportMd && (
          <motion.div
            data-testid="skill-export-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setExportMd(null)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass w-full max-w-3xl max-h-[80vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#00E5FF]" />
                  <span className="text-xs tracking-[0.25em] uppercase font-bold">Skill Preview · {exportMd.filename}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    data-testid="skill-export-download-btn"
                    onClick={downloadMd}
                    className="bg-[#00E5FF] text-black px-3 py-1.5 text-[10px] uppercase tracking-widest font-black hover:bg-white transition-colors flex items-center gap-1.5"
                  >
                    <FileDown size={12} /> Download
                  </button>
                  <button
                    data-testid="skill-export-close-btn"
                    onClick={() => setExportMd(null)}
                    className="border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold hover:border-[#FF0055] hover:text-[#FF0055] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
              <pre
                data-testid="skill-export-preview"
                className="flex-1 overflow-auto p-6 text-xs font-mono text-white/90 whitespace-pre-wrap"
              >{exportMd.skill_md}</pre>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NodeEditor({ node, onRename, onClose }) {
  const [label, setLabel] = useState(node.data.label);
  const [type, setType] = useState(node.data.type);
  const ref = useRef();
  useEffect(() => { setLabel(node.data.label); setType(node.data.type); }, [node]);
  return (
    <div className="absolute bottom-4 left-4 glass p-4 w-[280px] z-10" data-testid="node-editor-panel">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-[#FFB000]">Node</span>
        <button onClick={onClose} data-testid="node-editor-close" className="text-white/40 hover:text-[#FF0055] text-xs">✕</button>
      </div>
      <input
        data-testid="node-editor-label-input"
        value={label}
        onChange={(e) => { setLabel(e.target.value); onRename(node.id, e.target.value, type); }}
        className="w-full bg-transparent border border-white/15 focus:border-[#00E5FF] outline-none text-sm font-bold px-3 py-2 mb-2"
      />
      <select
        data-testid="node-editor-type-select"
        value={type}
        onChange={(e) => { setType(e.target.value); onRename(node.id, label, e.target.value); }}
        className="w-full bg-[#0D0D12] border border-white/15 focus:border-[#00E5FF] outline-none text-[11px] font-mono px-3 py-2 uppercase tracking-widest"
      >
        {NODE_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <div className="mt-3 text-[10px] font-mono text-white/50 leading-relaxed">
        click node → algorithm drawer opens →  swap tech.
      </div>
    </div>
  );
}
