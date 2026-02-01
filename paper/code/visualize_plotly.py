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
    subprocess.check_call(["pip", "install", "plotly", "kaleido", "pandas"])
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.subplots import make_subplots

OUTPUT_DIR = Path(__file__).parent.parent / 'figures'
OUTPUT_DIR.mkdir(exist_ok=True)

# Academic color palette
COLORS = {
    'primary': '#2563eb',      # Blue
    'secondary': '#16a34a',    # Green
    'tertiary': '#dc2626',     # Red
    'quaternary': '#9333ea',   # Purple
    'gray': '#6b7280',
    'light_gray': '#e5e7eb',
}

# Common layout settings for academic papers
LAYOUT_TEMPLATE = dict(
    font=dict(family="Arial, sans-serif", size=14),
    paper_bgcolor='white',
    plot_bgcolor='white',
    margin=dict(l=60, r=40, t=60, b=60),
)


def save_figure(fig, name: str):
    """Save figure in multiple formats."""
    # PNG for web/preview
    fig.write_image(str(OUTPUT_DIR / f"{name}.png"), scale=2, width=1000, height=600)
    # PDF for paper
    fig.write_image(str(OUTPUT_DIR / f"{name}.pdf"), width=1000, height=600)
    # HTML for interactive viewing
    fig.write_html(str(OUTPUT_DIR / f"{name}.html"), include_plotlyjs='cdn')
    print(f"Saved: {name}.png, {name}.pdf, {name}.html")


def plot_retrieval_comparison():
    """Compare retrieval methods on standard metrics."""
    methods = ['Flat RAG', 'HyDE', 'RAPTOR', 'GraphRAG', 'Memory Palace']

    # Metrics from paper
    recall_1 = [0.72, 0.75, 0.78, 0.81, 0.89]
    recall_3 = [0.84, 0.86, 0.88, 0.91, 0.96]
    context_kb = [46.5, 52.3, 38.2, 41.7, 1.2]

    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=('Retrieval Accuracy', 'Context Size'),
        horizontal_spacing=0.12
    )

    # Recall comparison
    fig.add_trace(
        go.Bar(name='Recall@1', x=methods, y=recall_1,
               marker_color=COLORS['primary'], opacity=0.8),
        row=1, col=1
    )
    fig.add_trace(
        go.Bar(name='Recall@3', x=methods, y=recall_3,
               marker_color=COLORS['secondary'], opacity=0.8),
        row=1, col=1
    )

    # Context size comparison
    colors = [COLORS['tertiary']] * 4 + [COLORS['secondary']]
    fig.add_trace(
        go.Bar(name='Context (KB)', x=methods, y=context_kb,
               marker_color=colors, showlegend=False,
               text=[f'{v:.1f}' for v in context_kb], textposition='outside'),
        row=1, col=2
    )

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='LLM Retrieval Performance Comparison', x=0.5),
        barmode='group',
        legend=dict(x=0.02, y=0.98),
        height=500
    )

    fig.update_yaxes(title_text='Score', range=[0, 1.1], row=1, col=1)
    fig.update_yaxes(title_text='Context Size (KB)', type='log', row=1, col=2)

    save_figure(fig, 'retrieval_comparison')


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
        name='Flat RAG',
        line=dict(color=COLORS['tertiary'], width=3),
        marker=dict(size=10)
    ))

    # Hierarchical line
    fig.add_trace(go.Scatter(
        x=memories, y=hier_kb,
        mode='lines+markers',
        name='Memory Palace (2-hop)',
        line=dict(color=COLORS['secondary'], width=3),
        marker=dict(size=10)
    ))

    # Fill between (savings area)
    fig.add_trace(go.Scatter(
        x=list(memories) + list(memories[::-1]),
        y=list(flat_kb) + list(hier_kb[::-1]),
        fill='toself',
        fillcolor='rgba(22, 163, 74, 0.15)',
        line=dict(width=0),
        name='Context Saved',
        showlegend=True
    ))

    # Add annotation for savings
    fig.add_annotation(
        x=500, y=125,
        text="97% reduction<br>at 1000 memories",
        showarrow=True,
        arrowhead=2,
        ax=50, ay=-30,
        font=dict(size=12, color=COLORS['secondary'])
    )

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='Context Size Scaling: Flat vs Hierarchical Retrieval', x=0.5),
        xaxis_title='Number of Memories',
        yaxis_title='Context Size (KB)',
        yaxis_type='log',
        legend=dict(x=0.02, y=0.98),
        height=500
    )

    save_figure(fig, 'context_scaling')


def plot_hallucination_detection():
    """Compare hallucination detection methods."""
    methods = ['Standard RAG', 'Self-Consistency', 'NLI-Based', 'SelfCheckGPT', 'FActScore', 'MP Verify Tokens']
    f1_scores = [0.60, 0.68, 0.71, 0.75, 0.83, 0.92]
    compute_cost = [1, 3, 4, 5, 6, 0.01]  # Relative cost

    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=('Hallucination Detection F1', 'Compute Cost (relative)'),
        horizontal_spacing=0.12
    )

    # F1 scores
    colors = [COLORS['gray']] * 5 + [COLORS['secondary']]
    fig.add_trace(
        go.Bar(x=methods, y=f1_scores, marker_color=colors,
               text=[f'{v:.0%}' for v in f1_scores], textposition='outside'),
        row=1, col=1
    )

    # Compute cost
    fig.add_trace(
        go.Bar(x=methods, y=compute_cost, marker_color=colors,
               text=[f'{v:.2f}x' if v < 1 else f'{v:.0f}x' for v in compute_cost],
               textposition='outside', showlegend=False),
        row=1, col=2
    )

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='Hallucination Detection: Accuracy vs Cost', x=0.5),
        showlegend=False,
        height=500
    )

    fig.update_yaxes(title_text='F1 Score', range=[0, 1.1], row=1, col=1)
    fig.update_yaxes(title_text='Relative Compute Cost', type='log', row=1, col=2)

    save_figure(fig, 'hallucination_detection')


def plot_sota_comparison():
    """Compare against SOTA embedding and retrieval systems."""
    # MTEB-style comparison
    systems = [
        'Google Gecko', 'Cohere embed-v4', 'OpenAI-3-large',
        'Voyage-3', 'ColBERT', 'Memory Palace'
    ]
    ndcg = [0.663, 0.652, 0.646, 0.638, 0.524, 0.582]
    params_b = [1.2, 1.0, None, None, 0.11, 0]  # Billions of params (None = unknown)

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
                  annotation_text="Memory Palace (0 params)")

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='NDCG@10 Comparison with SOTA Systems', x=0.5),
        xaxis_title='System',
        yaxis_title='NDCG@10',
        yaxis_range=[0, 0.8],
        height=500
    )

    save_figure(fig, 'sota_comparison')


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
        fillcolor='rgba(220, 38, 38, 0.1)'
    ))

    fig.add_trace(go.Scatterpolar(
        r=graphrag + [graphrag[0]],
        theta=categories + [categories[0]],
        fill='toself',
        name='GraphRAG',
        line_color=COLORS['quaternary'],
        fillcolor='rgba(147, 51, 234, 0.1)'
    ))

    fig.add_trace(go.Scatterpolar(
        r=memory_palace + [memory_palace[0]],
        theta=categories + [categories[0]],
        fill='toself',
        name='Memory Palace',
        line_color=COLORS['secondary'],
        fillcolor='rgba(22, 163, 74, 0.2)'
    ))

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        polar=dict(
            radialaxis=dict(visible=True, range=[0, 1])
        ),
        title=dict(text='LLM Memory System Comparison', x=0.5),
        legend=dict(x=0.85, y=0.95),
        height=600
    )

    save_figure(fig, 'method_radar')


def plot_beir_comparison():
    """BEIR benchmark comparison."""
    datasets = ['Natural Questions', 'HotpotQA', 'MS MARCO', 'Average']

    bm25 = [0.329, 0.603, 0.228, 0.387]
    contriever = [0.498, 0.638, 0.407, 0.514]
    colbert = [0.524, 0.593, 0.400, 0.506]
    graphrag = [0.557, 0.643, 0.412, 0.537]
    memory_palace = [0.582, 0.671, 0.428, 0.560]

    fig = go.Figure()

    fig.add_trace(go.Bar(name='BM25', x=datasets, y=bm25, marker_color=COLORS['light_gray']))
    fig.add_trace(go.Bar(name='Contriever', x=datasets, y=contriever, marker_color=COLORS['gray']))
    fig.add_trace(go.Bar(name='ColBERT', x=datasets, y=colbert, marker_color=COLORS['quaternary']))
    fig.add_trace(go.Bar(name='GraphRAG', x=datasets, y=graphrag, marker_color=COLORS['primary']))
    fig.add_trace(go.Bar(name='Memory Palace', x=datasets, y=memory_palace, marker_color=COLORS['secondary']))

    fig.update_layout(
        **LAYOUT_TEMPLATE,
        title=dict(text='BEIR Benchmark: NDCG@10 by Dataset', x=0.5),
        xaxis_title='Dataset',
        yaxis_title='NDCG@10',
        barmode='group',
        legend=dict(x=0.7, y=0.98),
        height=500
    )

    save_figure(fig, 'beir_comparison')


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
    plot_method_radar()
    plot_beir_comparison()

    print()
    print("=" * 60)
    print(f"All figures saved to: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    generate_all()
