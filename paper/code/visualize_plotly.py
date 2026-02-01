#!/usr/bin/env python3
"""
Publication-Quality Visualizations for Memory Palace Paper

Uses Plotly for cleaner, more professional charts suitable for academic papers.
Exports to PNG, PDF, and interactive HTML.
"""

import os
from pathlib import Path
import numpy as np

try:
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.subplots import make_subplots
except ImportError:
    print("Installing plotly and kaleido for export...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "plotly", "kaleido", "pandas"])
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.subplots import make_subplots

OUTPUT_DIR = Path(__file__).parent.parent / 'figures'
OUTPUT_DIR.mkdir(exist_ok=True)

# Okabe-Ito Colorblind-Friendly Palette (Publication Standard)
# Source: https://personal.sron.nl/~pault/ and Wong 2011 Nature Methods
OKABE_ITO = {
    'orange': '#E69F00',
    'sky_blue': '#56B4E9',
    'bluish_green': '#009E73',
    'yellow': '#F0E442',
    'blue': '#0072B2',
    'vermillion': '#D55E00',
    'reddish_purple': '#CC79A7',
    'black': '#000000'
}

# Shorthand for plotting
COLORS = {
    'primary': OKABE_ITO['blue'],
    'secondary': OKABE_ITO['bluish_green'],
    'tertiary': OKABE_ITO['vermillion'],
    'quaternary': OKABE_ITO['reddish_purple'],
    'highlight': OKABE_ITO['orange'],
    'gray': '#6b7280',
    'light_gray': '#e5e7eb',
}

# Color list for multi-series plots
COLOR_LIST = [
    OKABE_ITO['blue'],
    OKABE_ITO['orange'],
    OKABE_ITO['bluish_green'],
    OKABE_ITO['vermillion'],
    OKABE_ITO['reddish_purple'],
    OKABE_ITO['sky_blue'],
]

# Common layout settings for academic papers (Publication Standard)
# Font: Arial 10-14pt, white background, minimal margins
LAYOUT_TEMPLATE = dict(
    font=dict(family="Arial, Helvetica, sans-serif", size=11),
    paper_bgcolor='white',
    plot_bgcolor='white',
    margin=dict(l=50, r=30, t=50, b=50),
    # Remove gridlines for cleaner look
    xaxis=dict(showgrid=False, linecolor='black', linewidth=1, mirror=True, tickfont=dict(size=10)),
    yaxis=dict(showgrid=True, gridcolor='#f0f0f0', linecolor='black', linewidth=1, mirror=True, tickfont=dict(size=10)),
)


def save_figure(fig, name: str, width: int = 800, height: int = 500):
    """Save figure in multiple formats optimized for paper."""
    # PNG for web/preview (2x scale for high DPI)
    fig.write_image(str(OUTPUT_DIR / f"{name}.png"), scale=2, width=width, height=height)
    # PDF for paper (standard resolution)
    fig.write_image(str(OUTPUT_DIR / f"{name}.pdf"), width=width, height=height)
    # HTML for interactive viewing
    fig.write_html(str(OUTPUT_DIR / f"{name}.html"), include_plotlyjs='cdn')
    print(f"Saved: {name}.png, {name}.pdf, {name}.html")


def plot_retrieval_comparison():
    """Compare retrieval methods on standard metrics."""
    methods = ['Flat RAG', 'HyDE', 'RAPTOR', 'GraphRAG', 'Memory<br>Palace']

    # Metrics from paper
    recall_1 = [0.72, 0.75, 0.78, 0.81, 0.89]
    recall_3 = [0.84, 0.86, 0.88, 0.91, 0.96]
    context_kb = [46.5, 52.3, 38.2, 41.7, 1.2]

    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=('<b>Retrieval Accuracy</b>', '<b>Context Size (KB)</b>'),
        horizontal_spacing=0.15
    )

    # Recall comparison
    fig.add_trace(
        go.Bar(name='Recall@1', x=methods, y=recall_1,
               marker_color=COLORS['primary'], opacity=0.9,
               text=[f'{v:.0%}' for v in recall_1], textposition='outside'),
        row=1, col=1
    )
    fig.add_trace(
        go.Bar(name='Recall@3', x=methods, y=recall_3,
               marker_color=COLORS['secondary'], opacity=0.9,
               text=[f'{v:.0%}' for v in recall_3], textposition='outside'),
        row=1, col=1
    )

    # Context size comparison - highlight Memory Palace
    colors = [COLORS['gray']] * 4 + [COLORS['secondary']]
    fig.add_trace(
        go.Bar(name='Context (KB)', x=methods, y=context_kb,
               marker_color=colors, showlegend=False,
               text=[f'{v:.1f}' for v in context_kb], textposition='outside'),
        row=1, col=2
    )

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='<b>LLM Retrieval Performance Comparison</b>', x=0.5, font=dict(size=14)),
        barmode='group',
        legend=dict(x=0.01, y=0.99, bgcolor='rgba(255,255,255,0.8)'),
        height=420
    )

    fig.update_yaxes(title_text='Score', range=[0, 1.15], row=1, col=1)
    fig.update_yaxes(title_text='KB', type='log', row=1, col=2)
    fig.update_xaxes(tickangle=-30, row=1, col=1)
    fig.update_xaxes(tickangle=-30, row=1, col=2)

    save_figure(fig, 'retrieval_comparison', width=700, height=320)


def plot_context_scaling():
    """Show context scaling: flat vs hierarchical."""
    memories = np.array([10, 50, 100, 200, 500, 1000])
    flat_kb = memories * 0.5  # 500 bytes per memory average
    hier_kb = np.array([0.8, 1.0, 1.2, 1.5, 2.0, 2.5])  # Hierarchical stays small

    fig = go.Figure()

    # Flat RAG line
    fig.add_trace(go.Scatter(
        x=memories, y=flat_kb,
        mode='lines+markers',
        name='Flat RAG (linear growth)',
        line=dict(color=COLORS['tertiary'], width=3),
        marker=dict(size=8)
    ))

    # Hierarchical line
    fig.add_trace(go.Scatter(
        x=memories, y=hier_kb,
        mode='lines+markers',
        name='Memory Palace (near-constant)',
        line=dict(color=COLORS['secondary'], width=3),
        marker=dict(size=8)
    ))

    # Fill between (savings area)
    fig.add_trace(go.Scatter(
        x=list(memories) + list(memories[::-1]),
        y=list(flat_kb) + list(hier_kb[::-1]),
        fill='toself',
        fillcolor='rgba(22, 163, 74, 0.12)',
        line=dict(width=0),
        name='Context Saved (97-99%)',
        showlegend=True
    ))

    # Add annotation for savings
    fig.add_annotation(
        x=700, y=200,
        text="<b>97% reduction</b>",
        showarrow=True,
        arrowhead=2,
        ax=40, ay=-25,
        font=dict(size=11, color=COLORS['secondary'])
    )

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='<b>Context Size Scaling</b>', x=0.5, font=dict(size=14)),
        xaxis_title='Number of Memories',
        yaxis_title='Context Size (KB)',
        yaxis_type='log',
        yaxis_range=[-0.1, 3],
        legend=dict(x=0.02, y=0.98, bgcolor='rgba(255,255,255,0.8)'),
        height=400
    )

    save_figure(fig, 'context_scaling', width=600, height=300)


def plot_hallucination_detection():
    """Compare hallucination detection methods."""
    methods = ['Standard<br>RAG', 'Self-<br>Consistency', 'NLI-<br>Based', 'SelfCheck<br>GPT', 'FActScore', 'MP Verify<br>Tokens']
    f1_scores = [0.60, 0.68, 0.71, 0.75, 0.83, 0.92]
    compute_cost = [1, 3, 4, 5, 6, 0.01]  # Relative cost

    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=('<b>F1 Score (higher is better)</b>', '<b>Compute Cost (lower is better)</b>'),
        horizontal_spacing=0.15
    )

    # F1 scores - highlight best
    colors = [COLORS['gray']] * 5 + [COLORS['secondary']]
    fig.add_trace(
        go.Bar(x=methods, y=f1_scores, marker_color=colors,
               text=[f'{v:.0%}' for v in f1_scores], textposition='outside'),
        row=1, col=1
    )

    # Compute cost - highlight best (lowest)
    fig.add_trace(
        go.Bar(x=methods, y=compute_cost, marker_color=colors,
               text=[f'{v:.2f}×' if v < 1 else f'{v:.0f}×' for v in compute_cost],
               textposition='outside', showlegend=False),
        row=1, col=2
    )

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='<b>Hallucination Detection: Accuracy vs Cost</b>', x=0.5, font=dict(size=14)),
        showlegend=False,
        height=420
    )

    fig.update_yaxes(title_text='F1 Score', range=[0, 1.1], row=1, col=1)
    fig.update_yaxes(title_text='Relative Cost', type='log', range=[-2.1, 1], row=1, col=2)

    # Add annotations
    fig.add_annotation(
        text="<b>Best: 92%</b>", x=methods[-1], y=f1_scores[-1] + 0.08,
        showarrow=False, row=1, col=1, font=dict(color=COLORS['secondary'], size=10)
    )
    fig.add_annotation(
        text="<b>600× cheaper</b>", x=methods[-1], y=0.03,
        showarrow=False, row=1, col=2, font=dict(color=COLORS['secondary'], size=10)
    )

    save_figure(fig, 'hallucination_detection', width=700, height=300)


def plot_sota_comparison():
    """Compare against SOTA embedding and retrieval systems."""
    systems = [
        'Google<br>Gecko', 'Cohere<br>embed-v4', 'OpenAI<br>3-large',
        'Voyage-3', 'ColBERT', 'Memory<br>Palace'
    ]
    ndcg = [0.663, 0.652, 0.646, 0.638, 0.524, 0.582]
    params = ['1.2B', '~1B', '?', '?', '110M', '0']

    fig = go.Figure()

    colors = [COLORS['gray']] * 5 + [COLORS['secondary']]

    fig.add_trace(go.Bar(
        x=systems, y=ndcg,
        marker_color=colors,
        text=[f'{v:.1%}' for v in ndcg],
        textposition='outside'
    ))

    # Add horizontal line for Memory Palace
    fig.add_hline(y=0.582, line_dash="dash", line_color=COLORS['secondary'],
                  annotation_text="<b>Memory Palace: 0 trainable parameters</b>",
                  annotation_position="top left",
                  annotation_font=dict(size=10))

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='<b>NDCG@10: Memory Palace vs SOTA Systems</b>', x=0.5, font=dict(size=14)),
        xaxis_title='',
        yaxis_title='NDCG@10',
        yaxis_range=[0, 0.78],
        height=380
    )

    save_figure(fig, 'sota_comparison', width=600, height=280)


def plot_mteb_comparison():
    """MTEB benchmark comparison with commercial and Chinese providers."""
    # Categories: Commercial US, Chinese/Multilingual, Open Source, Memory Palace
    systems = [
        'Google<br>Gecko', 'OpenAI<br>3-large', 'Cohere<br>embed-v3',
        'Jina<br>v3', 'BGE-M3<br>(BAAI)', 'Voyage<br>3',
        'E5-large<br>v2', 'GTE-Qwen2<br>(Alibaba)', 'Memory<br>Palace'
    ]

    # MTEB average scores (retrieval subset)
    mteb_scores = [0.663, 0.646, 0.644, 0.655, 0.635, 0.638, 0.620, 0.628, 0.560]

    # Parameter counts (in billions, 0 for Memory Palace)
    params_b = [1.2, None, 1.0, 0.57, 0.57, None, 0.33, 1.5, 0]

    # Color by category
    colors = [
        OKABE_ITO['blue'],       # Google - Commercial
        OKABE_ITO['blue'],       # OpenAI - Commercial
        OKABE_ITO['blue'],       # Cohere - Commercial
        OKABE_ITO['orange'],     # Jina - Multilingual
        OKABE_ITO['orange'],     # BGE - Chinese/Multi
        OKABE_ITO['blue'],       # Voyage - Commercial
        OKABE_ITO['vermillion'], # E5 - Open Source
        OKABE_ITO['orange'],     # GTE-Qwen - Chinese
        COLORS['secondary'],     # Memory Palace
    ]

    fig = go.Figure()

    fig.add_trace(go.Bar(
        x=systems, y=mteb_scores,
        marker_color=colors,
        text=[f'{v:.1%}' for v in mteb_scores],
        textposition='outside'
    ))

    # Add category legend
    fig.add_trace(go.Scatter(x=[None], y=[None], mode='markers',
        marker=dict(size=10, color=OKABE_ITO['blue']),
        name='Commercial (US)'))
    fig.add_trace(go.Scatter(x=[None], y=[None], mode='markers',
        marker=dict(size=10, color=OKABE_ITO['orange']),
        name='Chinese/Multilingual'))
    fig.add_trace(go.Scatter(x=[None], y=[None], mode='markers',
        marker=dict(size=10, color=OKABE_ITO['vermillion']),
        name='Open Source'))
    fig.add_trace(go.Scatter(x=[None], y=[None], mode='markers',
        marker=dict(size=10, color=COLORS['secondary']),
        name='Memory Palace (0 params)'))

    # Add horizontal line for Memory Palace
    fig.add_hline(y=0.560, line_dash="dash", line_color=COLORS['secondary'],
                  annotation_text="<b>Zero trainable parameters</b>",
                  annotation_position="bottom right",
                  annotation_font=dict(size=9))

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='<b>MTEB Retrieval Benchmark: Global Provider Comparison</b>', x=0.5, font=dict(size=14)),
        xaxis_title='',
        yaxis_title='MTEB Average Score',
        yaxis_range=[0, 0.78],
        legend=dict(x=0.70, y=0.98, bgcolor='rgba(255,255,255,0.9)'),
        height=400
    )

    save_figure(fig, 'mteb_comparison', width=750, height=320)


def plot_chinese_providers():
    """Compare Chinese embedding providers specifically."""
    systems = [
        'BGE-M3<br>(BAAI)', 'GTE-Qwen2<br>(Alibaba)', 'Jina<br>v3',
        'M3E-large', 'Text2Vec<br>(Tencent)', 'Memory<br>Palace'
    ]

    # Multilingual MTEB scores (Chinese + English average)
    multilingual_scores = [0.635, 0.628, 0.655, 0.521, 0.498, 0.560]

    # Chinese-specific benchmark (C-MTEB) - relative scores
    chinese_scores = [0.71, 0.69, 0.62, 0.68, 0.65, 0.52]

    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=('<b>MTEB (Multilingual)</b>', '<b>C-MTEB (Chinese-specific)</b>'),
        horizontal_spacing=0.15
    )

    # Color Memory Palace differently
    colors = [COLORS['gray']] * 5 + [COLORS['secondary']]

    # MTEB scores
    fig.add_trace(
        go.Bar(x=systems, y=multilingual_scores, marker_color=colors,
               text=[f'{v:.1%}' for v in multilingual_scores], textposition='outside'),
        row=1, col=1
    )

    # C-MTEB scores
    fig.add_trace(
        go.Bar(x=systems, y=chinese_scores, marker_color=colors,
               text=[f'{v:.0%}' for v in chinese_scores], textposition='outside',
               showlegend=False),
        row=1, col=2
    )

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='<b>Chinese Embedding Providers Comparison</b>', x=0.5, font=dict(size=14)),
        showlegend=False,
        height=380
    )

    fig.update_yaxes(title_text='Score', range=[0, 0.78], row=1, col=1)
    fig.update_yaxes(title_text='Score', range=[0, 0.85], row=1, col=2)
    fig.update_xaxes(tickangle=-30, row=1, col=1)
    fig.update_xaxes(tickangle=-30, row=1, col=2)

    # Add insight annotation
    fig.add_annotation(
        x='Memory<br>Palace', y=0.56, text="<b>No Chinese<br>training data</b>",
        showarrow=True, arrowhead=2, ax=30, ay=-30,
        row=1, col=2, font=dict(color=COLORS['secondary'], size=9)
    )

    save_figure(fig, 'chinese_providers', width=700, height=300)


def plot_method_radar():
    """Radar chart comparing retrieval methods."""
    categories = ['Recall@3', 'Context<br>Efficiency', 'Hallucination<br>Detection',
                  'Scalability', 'Latency']

    # Normalized scores (0-1)
    flat_rag = [0.84, 0.05, 0.60, 0.3, 0.7]
    graphrag = [0.91, 0.10, 0.68, 0.5, 0.5]
    memory_palace = [0.96, 0.99, 0.92, 0.9, 0.85]

    fig = go.Figure()

    fig.add_trace(go.Scatterpolar(
        r=flat_rag + [flat_rag[0]],
        theta=categories + [categories[0]],
        fill='toself',
        name='Flat RAG',
        line_color=COLORS['tertiary'],
        line_width=2,
        fillcolor='rgba(213, 94, 0, 0.1)'
    ))

    fig.add_trace(go.Scatterpolar(
        r=graphrag + [graphrag[0]],
        theta=categories + [categories[0]],
        fill='toself',
        name='GraphRAG',
        line_color=COLORS['quaternary'],
        line_width=2,
        fillcolor='rgba(204, 121, 167, 0.1)'
    ))

    fig.add_trace(go.Scatterpolar(
        r=memory_palace + [memory_palace[0]],
        theta=categories + [categories[0]],
        fill='toself',
        name='Memory Palace',
        line_color=COLORS['secondary'],
        line_width=3,
        fillcolor='rgba(0, 158, 115, 0.2)'
    ))

    fig.update_layout(
        font=dict(family="Arial, Helvetica, sans-serif", size=11),
        paper_bgcolor='white',
        plot_bgcolor='white',
        polar=dict(
            radialaxis=dict(visible=True, range=[0, 1], tickfont=dict(size=9)),
            angularaxis=dict(tickfont=dict(size=10))
        ),
        title=dict(text='<b>LLM Memory System Comparison</b>', x=0.5, font=dict(size=14)),
        legend=dict(x=0.78, y=0.98, bgcolor='rgba(255,255,255,0.9)'),
        height=450,
        margin=dict(l=60, r=60, t=60, b=40)
    )

    save_figure(fig, 'method_radar', width=450, height=350)


def plot_beir_comparison():
    """BEIR benchmark comparison with PubMed/TREC-COVID."""
    datasets = ['Natural<br>Questions', 'HotpotQA', 'MS MARCO', 'TREC-<br>COVID', 'Average']

    # Including TREC-COVID (PubMed biomedical retrieval)
    bm25 = [0.329, 0.603, 0.228, 0.594, 0.439]
    contriever = [0.498, 0.638, 0.407, 0.274, 0.454]
    colbert = [0.524, 0.593, 0.400, 0.677, 0.549]
    graphrag = [0.557, 0.643, 0.412, 0.682, 0.574]
    memory_palace = [0.582, 0.671, 0.428, 0.651, 0.583]

    fig = go.Figure()

    fig.add_trace(go.Bar(name='BM25', x=datasets, y=bm25, marker_color=COLORS['light_gray']))
    fig.add_trace(go.Bar(name='Contriever', x=datasets, y=contriever, marker_color=COLORS['gray']))
    fig.add_trace(go.Bar(name='ColBERT', x=datasets, y=colbert, marker_color=COLORS['quaternary']))
    fig.add_trace(go.Bar(name='GraphRAG', x=datasets, y=graphrag, marker_color=COLORS['primary']))
    fig.add_trace(go.Bar(name='Memory Palace', x=datasets, y=memory_palace, marker_color=COLORS['secondary']))

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='<b>BEIR Benchmark: NDCG@10 by Dataset</b>', x=0.5, font=dict(size=14)),
        xaxis_title='',
        yaxis_title='NDCG@10',
        yaxis_range=[0, 0.78],
        barmode='group',
        legend=dict(x=0.65, y=0.98, bgcolor='rgba(255,255,255,0.9)'),
        height=400,
        bargap=0.12,
        bargroupgap=0.08
    )

    save_figure(fig, 'beir_comparison', width=700, height=320)


def plot_red_queen_ablation():
    """Red Queen pre-learning ablation study."""
    rq_rounds = ['0', '3', '5']

    # SMASHIN=0 (weak encoding)
    weak_retention = [0.52, 0.77, 0.75]
    weak_retrievals = [9.1, 6.5, 5.7]

    # SMASHIN=12 (strong encoding)
    strong_retention = [1.0, 1.0, 1.0]
    strong_retrievals = [3.7, 3.8, 3.5]

    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=('<b>Final Retention</b>', '<b>Retrievals per Memory</b>'),
        horizontal_spacing=0.12
    )

    # Retention comparison
    fig.add_trace(
        go.Bar(name='Weak encoding (SMASHIN=0)', x=rq_rounds, y=weak_retention,
               marker_color=COLORS['tertiary'], opacity=0.9,
               text=[f'{v:.0%}' for v in weak_retention], textposition='outside'),
        row=1, col=1
    )
    fig.add_trace(
        go.Bar(name='Strong encoding (SMASHIN=12)', x=rq_rounds, y=strong_retention,
               marker_color=COLORS['secondary'], opacity=0.9,
               text=[f'{v:.0%}' for v in strong_retention], textposition='outside'),
        row=1, col=1
    )

    # Retrievals comparison
    fig.add_trace(
        go.Bar(name='Weak', x=rq_rounds, y=weak_retrievals,
               marker_color=COLORS['tertiary'], opacity=0.9, showlegend=False,
               text=[f'{v:.1f}' for v in weak_retrievals], textposition='outside'),
        row=1, col=2
    )
    fig.add_trace(
        go.Bar(name='Strong', x=rq_rounds, y=strong_retrievals,
               marker_color=COLORS['secondary'], opacity=0.9, showlegend=False,
               text=[f'{v:.1f}' for v in strong_retrievals], textposition='outside'),
        row=1, col=2
    )

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='<b>Red Queen Pre-Learning Ablation</b>', x=0.5, font=dict(size=14)),
        barmode='group',
        legend=dict(x=0.01, y=0.99, bgcolor='rgba(255,255,255,0.9)'),
        height=380
    )

    fig.update_xaxes(title_text='RQ Rounds', row=1, col=1)
    fig.update_xaxes(title_text='RQ Rounds', row=1, col=2)
    fig.update_yaxes(title_text='Retention', range=[0, 1.15], row=1, col=1)
    fig.update_yaxes(title_text='Retrievals', range=[0, 11], row=1, col=2)

    # Add key insight annotations
    fig.add_annotation(
        x='5', y=0.75, text="<b>+23%</b>", showarrow=False,
        row=1, col=1, font=dict(color=COLORS['tertiary'], size=10),
        yshift=25
    )
    fig.add_annotation(
        x='5', y=5.7, text="<b>-37%</b>", showarrow=False,
        row=1, col=2, font=dict(color=COLORS['tertiary'], size=10),
        yshift=20
    )

    save_figure(fig, 'red_queen_ablation', width=650, height=300)


def plot_red_queen_interaction():
    """Show interaction between SMASHIN score and RQ rounds."""
    smashin_scores = [0, 3, 6, 9, 12]

    # Retrievals needed (without RQ)
    retrievals_no_rq = [9.1, 7.5, 5.8, 4.5, 3.7]
    # Retrievals needed (with 5 RQ rounds)
    retrievals_with_rq = [5.7, 5.0, 4.2, 3.8, 3.5]

    fig = go.Figure()

    # Fill between (improvement area) - add first for layering
    fig.add_trace(go.Scatter(
        x=smashin_scores + smashin_scores[::-1],
        y=retrievals_no_rq + retrievals_with_rq[::-1],
        fill='toself',
        fillcolor='rgba(0, 158, 115, 0.12)',
        line=dict(width=0),
        name='RQ Improvement',
        showlegend=True
    ))

    # Without Red Queen
    fig.add_trace(go.Scatter(
        x=smashin_scores, y=retrievals_no_rq,
        mode='lines+markers',
        name='Without Red Queen',
        line=dict(color=COLORS['tertiary'], width=3),
        marker=dict(size=10)
    ))

    # With Red Queen
    fig.add_trace(go.Scatter(
        x=smashin_scores, y=retrievals_with_rq,
        mode='lines+markers',
        name='With 5 RQ Rounds',
        line=dict(color=COLORS['secondary'], width=3),
        marker=dict(size=10)
    ))

    # Add annotations - simplified
    fig.add_annotation(
        x=1.5, y=8,
        text="<b>Weak encodings:<br>37% fewer retrievals</b>",
        showarrow=False,
        font=dict(size=10, color=COLORS['tertiary']),
        bgcolor='rgba(255,255,255,0.8)'
    )

    fig.add_annotation(
        x=10.5, y=4.2,
        text="<b>Strong encodings:<br>minimal benefit</b>",
        showarrow=False,
        font=dict(size=10, color=COLORS['secondary']),
        bgcolor='rgba(255,255,255,0.8)'
    )

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='<b>Red Queen × SMASHIN Score Interaction</b>', x=0.5, font=dict(size=14)),
        xaxis_title='SMASHIN SCOPE Score',
        yaxis_title='Retrievals per Memory',
        yaxis_range=[2.5, 10],
        legend=dict(x=0.55, y=0.98, bgcolor='rgba(255,255,255,0.9)'),
        height=400
    )

    save_figure(fig, 'red_queen_interaction', width=600, height=300)


def plot_tradeoff_speed_accuracy():
    """Trade-off chart: Speed vs Accuracy by profile."""
    profiles = ['Interview', 'Reference', 'Study', 'Teaching']
    speed_ms = [800, 3500, 20000, 35000]  # Latency in ms
    accuracy = [0.70, 0.80, 0.95, 0.98]

    fig = go.Figure()

    # Create scatter with different sizes based on corpus
    corpus_sizes = [200, 500, 50, 30]
    sizes = [s/10 + 10 for s in corpus_sizes]

    colors_by_profile = [COLORS['highlight'], COLORS['primary'], COLORS['secondary'], COLORS['quaternary']]

    for i, (prof, spd, acc, sz, col) in enumerate(zip(profiles, speed_ms, accuracy, sizes, colors_by_profile)):
        fig.add_trace(go.Scatter(
            x=[spd], y=[acc],
            mode='markers+text',
            name=prof,
            marker=dict(size=sz, color=col, opacity=0.8),
            text=[prof],
            textposition='top center',
            textfont=dict(size=10)
        ))

    # Add Pareto frontier line
    fig.add_trace(go.Scatter(
        x=speed_ms, y=accuracy,
        mode='lines',
        name='Pareto Frontier',
        line=dict(color=COLORS['gray'], width=1, dash='dash'),
        showlegend=False
    ))

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='<b>Speed vs Accuracy Trade-off</b>', x=0.5, font=dict(size=14)),
        xaxis_title='Latency (ms)',
        yaxis_title='Accuracy',
        xaxis_type='log',
        xaxis_range=[2.5, 5],
        yaxis_range=[0.65, 1.02],
        showlegend=False,
        height=350
    )

    # Add annotations
    fig.add_annotation(x=800, y=0.70, text="<b>Fast</b>", showarrow=False,
                       font=dict(size=9), yshift=-25)
    fig.add_annotation(x=35000, y=0.98, text="<b>Accurate</b>", showarrow=False,
                       font=dict(size=9), yshift=15)

    save_figure(fig, 'tradeoff_speed_accuracy', width=500, height=300)


def plot_tradeoff_corpus_accuracy():
    """Trade-off chart: Corpus Size vs Accuracy."""
    profiles = ['Teaching', 'Study', 'Interview', 'Reference']
    corpus = [30, 50, 200, 500]
    accuracy = [0.98, 0.95, 0.70, 0.80]
    rq_rounds = [5, 5, 0, 3]

    fig = go.Figure()

    # Color by RQ rounds
    colors = [COLORS['secondary'] if rq >= 3 else COLORS['tertiary'] for rq in rq_rounds]

    fig.add_trace(go.Scatter(
        x=corpus, y=accuracy,
        mode='markers+text',
        marker=dict(
            size=[rq * 6 + 12 for rq in rq_rounds],
            color=colors,
            opacity=0.8
        ),
        text=profiles,
        textposition='top center',
        textfont=dict(size=10)
    ))

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='<b>Corpus Size vs Accuracy</b>', x=0.5, font=dict(size=14)),
        xaxis_title='Corpus Size (memories)',
        yaxis_title='Accuracy',
        xaxis_type='log',
        yaxis_range=[0.65, 1.02],
        showlegend=False,
        height=350
    )

    # Legend annotation
    fig.add_annotation(x=0.98, y=0.98, xref='paper', yref='paper',
                       text="<b>Marker size = RQ rounds</b><br>Green = RQ≥3, Orange = RQ<3",
                       showarrow=False, font=dict(size=9),
                       bgcolor='rgba(255,255,255,0.9)', borderpad=4)

    save_figure(fig, 'tradeoff_corpus_accuracy', width=500, height=300)


def plot_tradeoff_profiles():
    """Combined profile comparison with multiple metrics."""
    profiles = ['Interview', 'Reference', 'Study', 'Teaching']

    # Normalized metrics (0-1 scale)
    metrics = {
        'Speed': [1.0, 0.6, 0.15, 0.08],  # Inverse of latency
        'Accuracy': [0.70, 0.80, 0.95, 0.98],
        'Corpus Coverage': [0.40, 1.0, 0.10, 0.06],  # Normalized to max 500
        'Encoding Depth': [0.2, 0.5, 1.0, 1.0],  # Image size
        'RQ Investment': [0.0, 0.6, 1.0, 1.0],  # RQ rounds normalized
    }

    fig = go.Figure()

    colors_by_profile = [COLORS['highlight'], COLORS['primary'], COLORS['secondary'], COLORS['quaternary']]

    for i, profile in enumerate(profiles):
        values = [metrics[m][i] for m in metrics.keys()]
        fig.add_trace(go.Scatterpolar(
            r=values + [values[0]],
            theta=list(metrics.keys()) + [list(metrics.keys())[0]],
            fill='toself',
            name=profile,
            line_color=colors_by_profile[i],
            fillcolor=f'rgba{tuple(list(int(colors_by_profile[i].lstrip("#")[j:j+2], 16) for j in (0, 2, 4)) + [0.1])}'
        ))

    fig.update_layout(
        font=dict(family="Arial, Helvetica, sans-serif", size=11),
        paper_bgcolor='white',
        plot_bgcolor='white',
        polar=dict(
            radialaxis=dict(visible=True, range=[0, 1], tickfont=dict(size=9)),
            angularaxis=dict(tickfont=dict(size=10))
        ),
        title=dict(text='<b>Profile Trade-off Comparison</b>', x=0.5, font=dict(size=14)),
        legend=dict(x=0.78, y=0.98, bgcolor='rgba(255,255,255,0.9)'),
        height=400,
        margin=dict(l=60, r=60, t=60, b=40)
    )

    save_figure(fig, 'tradeoff_profiles', width=500, height=350)


def generate_all():
    """Generate all visualizations."""
    print("=" * 60)
    print("Generating Publication-Quality Visualizations (Plotly)")
    print("=" * 60)
    print()

    plot_retrieval_comparison()
    plot_context_scaling()
    plot_hallucination_detection()
    plot_sota_comparison()
    plot_mteb_comparison()
    plot_chinese_providers()
    plot_method_radar()
    plot_beir_comparison()
    plot_red_queen_ablation()
    plot_red_queen_interaction()
    plot_tradeoff_speed_accuracy()
    plot_tradeoff_corpus_accuracy()
    plot_tradeoff_profiles()

    print()
    print("=" * 60)
    print(f"All figures saved to: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    generate_all()
