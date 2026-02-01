#!/usr/bin/env python3
"""
Generate visualizations for the Memory Palace research paper.
"""

import json
import os
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime

# Set style
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['figure.figsize'] = (10, 6)
plt.rcParams['font.size'] = 12

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'figures')
os.makedirs(OUTPUT_DIR, exist_ok=True)


def plot_decay_comparison():
    """Plot decay prediction accuracy comparison."""
    methods = ['SM-2', 'FSRS', 'Memory Palace']
    mae_scores = [0.2183, 0.2183, 0.0938]
    accuracy = [80.2, 80.2, 86.4]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    # MAE comparison (lower is better)
    colors = ['#ff6b6b', '#4ecdc4', '#2ecc71']
    bars1 = ax1.bar(methods, mae_scores, color=colors, edgecolor='black', linewidth=1.2)
    ax1.set_ylabel('Mean Absolute Error (lower is better)')
    ax1.set_title('Decay Prediction: MAE Comparison')
    ax1.set_ylim(0, 0.3)

    # Add value labels
    for bar, val in zip(bars1, mae_scores):
        ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                f'{val:.4f}', ha='center', va='bottom', fontweight='bold')

    # Accuracy comparison (higher is better)
    bars2 = ax2.bar(methods, accuracy, color=colors, edgecolor='black', linewidth=1.2)
    ax2.set_ylabel('Accuracy %')
    ax2.set_title('Decay Prediction: Accuracy Comparison')
    ax2.set_ylim(0, 100)

    for bar, val in zip(bars2, accuracy):
        ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                f'{val:.1f}%', ha='center', va='bottom', fontweight='bold')

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, 'decay_prediction_comparison.png'), dpi=150, bbox_inches='tight')
    plt.savefig(os.path.join(OUTPUT_DIR, 'decay_prediction_comparison.pdf'), bbox_inches='tight')
    print("Saved: decay_prediction_comparison.png/pdf")
    plt.close()


def plot_learning_efficiency():
    """Plot learning efficiency: reviews vs retention."""
    methods = ['SM-2', 'FSRS', 'MP\n(SMASHIN=0)', 'MP\n(SMASHIN=6)', 'MP\n(SMASHIN=12)', 'Baseline']
    reviews_per_card = [18.6, 2.3, 9.1, 4.8, 3.7, 8.0]
    retention = [100, 100, 54, 42, 100, 0]

    fig, ax = plt.subplots(figsize=(10, 6))

    # Scatter plot with size representing efficiency
    colors = ['#ff6b6b', '#4ecdc4', '#95a5a6', '#3498db', '#2ecc71', '#e74c3c']

    for i, (m, r, ret, c) in enumerate(zip(methods, reviews_per_card, retention, colors)):
        # Size based on efficiency (retention / reviews)
        efficiency = ret / max(r, 0.1)
        size = 100 + efficiency * 20

        ax.scatter(r, ret, s=size, c=c, alpha=0.7, edgecolors='black', linewidth=1.5, label=m)
        ax.annotate(m, (r, ret), xytext=(5, 5), textcoords='offset points', fontsize=9)

    ax.set_xlabel('Reviews per Card (lower is more efficient)')
    ax.set_ylabel('Final Retention % (higher is better)')
    ax.set_title('Learning Efficiency: Reviews vs Retention')
    ax.set_xlim(0, 20)
    ax.set_ylim(-5, 110)

    # Add quadrant labels
    ax.axhline(y=80, color='gray', linestyle='--', alpha=0.5)
    ax.axvline(x=10, color='gray', linestyle='--', alpha=0.5)
    ax.text(2, 95, 'OPTIMAL\n(few reviews, high retention)', fontsize=9, color='green', alpha=0.7)
    ax.text(15, 95, 'EXPENSIVE\n(many reviews, high retention)', fontsize=9, color='orange', alpha=0.7)
    ax.text(2, 20, 'FAST BUT WEAK\n(few reviews, low retention)', fontsize=9, color='gray', alpha=0.7)
    ax.text(15, 20, 'WORST\n(many reviews, low retention)', fontsize=9, color='red', alpha=0.7)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, 'learning_efficiency.png'), dpi=150, bbox_inches='tight')
    plt.savefig(os.path.join(OUTPUT_DIR, 'learning_efficiency.pdf'), bbox_inches='tight')
    print("Saved: learning_efficiency.png/pdf")
    plt.close()


def plot_context_reduction():
    """Plot context size reduction with hierarchical index."""
    memories = [10, 50, 100, 200, 500, 1000]
    flat_kb = [m * 500 / 1000 for m in memories]
    hier_kb = [(400 + min(m, 7) * 300 + 500) / 1000 for m in memories]

    fig, ax = plt.subplots(figsize=(10, 6))

    ax.fill_between(memories, flat_kb, hier_kb, alpha=0.3, color='green', label='Context Saved')
    ax.plot(memories, flat_kb, 'r-o', linewidth=2, markersize=8, label='Flat Scan')
    ax.plot(memories, hier_kb, 'g-s', linewidth=2, markersize=8, label='Hierarchical (2-hop)')

    ax.set_xlabel('Number of Memories')
    ax.set_ylabel('Context Size (KB)')
    ax.set_title('Retrieval Context Size: Flat vs Hierarchical Index')
    ax.legend(loc='upper left')
    ax.set_yscale('log')
    ax.grid(True, alpha=0.3)

    # Add reduction percentages
    for i, m in enumerate(memories):
        reduction = (flat_kb[i] - hier_kb[i]) / flat_kb[i] * 100
        ax.annotate(f'{reduction:.0f}%\nsaved',
                   (m, (flat_kb[i] + hier_kb[i]) / 2),
                   fontsize=8, ha='center', color='green')

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, 'context_reduction.png'), dpi=150, bbox_inches='tight')
    plt.savefig(os.path.join(OUTPUT_DIR, 'context_reduction.pdf'), bbox_inches='tight')
    print("Saved: context_reduction.png/pdf")
    plt.close()


def plot_smashin_scope_effect():
    """Plot effect of SMASHIN SCOPE encoding on retention."""
    smashin_scores = list(range(0, 13))
    decay_rates = [0.20, 0.18, 0.15, 0.12, 0.10, 0.08, 0.06, 0.05, 0.04, 0.03, 0.025, 0.02, 0.015]

    # Calculate retention at different time points
    days = [1, 7, 14, 30]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    # Left: Decay rate by SMASHIN score
    ax1.plot(smashin_scores, decay_rates, 'b-o', linewidth=2, markersize=8)
    ax1.fill_between(smashin_scores, decay_rates, alpha=0.3)
    ax1.set_xlabel('SMASHIN SCOPE Score (# of factors)')
    ax1.set_ylabel('Decay Rate λ (lower = slower forgetting)')
    ax1.set_title('Effect of SMASHIN SCOPE Encoding on Decay Rate')
    ax1.set_xticks(smashin_scores)
    ax1.grid(True, alpha=0.3)

    # Add annotations
    ax1.annotate('No encoding', (0, 0.20), xytext=(1, 0.22),
                arrowprops=dict(arrowstyle='->', color='red'), color='red')
    ax1.annotate('Full SMASHIN SCOPE', (12, 0.015), xytext=(10, 0.05),
                arrowprops=dict(arrowstyle='->', color='green'), color='green')

    # Right: Retention curves for different SMASHIN scores
    time_points = np.linspace(0, 30, 100)
    scores_to_plot = [0, 4, 8, 12]
    colors = ['#e74c3c', '#f39c12', '#3498db', '#2ecc71']

    for score, color in zip(scores_to_plot, colors):
        decay = decay_rates[score]
        retention = [100 * np.exp(-t * decay) for t in time_points]
        ax2.plot(time_points, retention, color=color, linewidth=2,
                label=f'SMASHIN={score} (λ={decay})')

    ax2.axhline(y=50, color='gray', linestyle='--', alpha=0.5, label='50% threshold')
    ax2.set_xlabel('Days Since Review')
    ax2.set_ylabel('Retention %')
    ax2.set_title('Retention Curves by SMASHIN SCOPE Score')
    ax2.legend(loc='upper right')
    ax2.set_xlim(0, 30)
    ax2.set_ylim(0, 100)
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, 'smashin_scope_effect.png'), dpi=150, bbox_inches='tight')
    plt.savefig(os.path.join(OUTPUT_DIR, 'smashin_scope_effect.pdf'), bbox_inches='tight')
    print("Saved: smashin_scope_effect.png/pdf")
    plt.close()


def plot_method_comparison_radar():
    """Create radar chart comparing all methods."""
    from math import pi

    # Metrics (normalized 0-1, higher is better)
    metrics = ['Decay\nPrediction', 'Learning\nEfficiency', 'Context\nReduction',
               'Resilience', 'Personalization']

    # Scores for each method (normalized)
    sm2_scores = [0.80, 0.55, 0.0, 0.3, 0.2]
    fsrs_scores = [0.80, 0.95, 0.0, 0.4, 0.6]
    mp_scores = [0.93, 0.90, 0.99, 0.80, 0.95]

    # Number of metrics
    N = len(metrics)

    # Compute angle for each metric
    angles = [n / float(N) * 2 * pi for n in range(N)]
    angles += angles[:1]  # Complete the circle

    # Add first value to end to close the polygon
    sm2_scores += sm2_scores[:1]
    fsrs_scores += fsrs_scores[:1]
    mp_scores += mp_scores[:1]

    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))

    # Plot each method
    ax.plot(angles, sm2_scores, 'o-', linewidth=2, label='SM-2', color='#ff6b6b')
    ax.fill(angles, sm2_scores, alpha=0.1, color='#ff6b6b')

    ax.plot(angles, fsrs_scores, 's-', linewidth=2, label='FSRS', color='#4ecdc4')
    ax.fill(angles, fsrs_scores, alpha=0.1, color='#4ecdc4')

    ax.plot(angles, mp_scores, '^-', linewidth=2, label='Memory Palace', color='#2ecc71')
    ax.fill(angles, mp_scores, alpha=0.25, color='#2ecc71')

    # Set labels
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(metrics)
    ax.set_ylim(0, 1)

    plt.title('Method Comparison Across Metrics', size=14, y=1.08)
    plt.legend(loc='upper right', bbox_to_anchor=(1.3, 1.0))

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, 'method_comparison_radar.png'), dpi=150, bbox_inches='tight')
    plt.savefig(os.path.join(OUTPUT_DIR, 'method_comparison_radar.pdf'), bbox_inches='tight')
    print("Saved: method_comparison_radar.png/pdf")
    plt.close()


def plot_tradeoff_space():
    """Plot the speed-accuracy-corpus trade-off space."""
    fig = plt.figure(figsize=(10, 8))
    ax = fig.add_subplot(111, projection='3d')

    # Data points: (speed, accuracy, corpus)
    # Speed: 1-5 (5=fastest)
    # Accuracy: 0-100%
    # Corpus: log scale of memories

    methods = {
        'SM-2': (2, 80, 100, '#ff6b6b'),
        'FSRS': (3, 80, 500, '#4ecdc4'),
        'MP (minimal)': (5, 70, 200, '#95a5a6'),
        'MP (balanced)': (3, 85, 500, '#3498db'),
        'MP (full)': (1, 95, 50, '#2ecc71'),
        'Flat RAG': (1, 90, 50, '#9b59b6'),
    }

    for name, (speed, acc, corpus, color) in methods.items():
        ax.scatter(speed, acc, np.log10(corpus), c=color, s=200, alpha=0.8, edgecolors='black')
        ax.text(speed, acc, np.log10(corpus), f'  {name}', fontsize=9)

    ax.set_xlabel('Speed (higher = faster)')
    ax.set_ylabel('Accuracy %')
    ax.set_zlabel('Corpus Size (log scale)')
    ax.set_title('Trade-off Space: Speed vs Accuracy vs Corpus')

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, 'tradeoff_space.png'), dpi=150, bbox_inches='tight')
    print("Saved: tradeoff_space.png")
    plt.close()


def create_results_table():
    """Create a summary results table."""
    results = """
    | Method | Decay MAE | Accuracy | Reviews/Card | Retention | Context |
    |--------|-----------|----------|--------------|-----------|---------|
    | SM-2 | 0.218 | 80.2% | 18.6 | 100% | Full |
    | FSRS | 0.218 | 80.2% | 2.3 | 100% | Full |
    | Memory Palace (S=0) | 0.094 | 86.4% | 9.1 | 54% | 1.2KB |
    | Memory Palace (S=6) | 0.094 | 86.4% | 4.8 | 42% | 1.2KB |
    | Memory Palace (S=12) | 0.094 | 86.4% | 3.7 | 100% | 1.2KB |
    | Baseline | N/A | N/A | 8.0 | 0% | Full |
    """
    print("\nResults Summary Table:")
    print(results)

    with open(os.path.join(OUTPUT_DIR, 'results_table.md'), 'w') as f:
        f.write(results)
    print("Saved: results_table.md")


if __name__ == "__main__":
    print("Generating visualizations for Memory Palace paper...")
    print("=" * 50)

    plot_decay_comparison()
    plot_learning_efficiency()
    plot_context_reduction()
    plot_smashin_scope_effect()
    plot_method_comparison_radar()
    plot_tradeoff_space()
    create_results_table()

    print("\n" + "=" * 50)
    print(f"All visualizations saved to: {OUTPUT_DIR}")
    print("=" * 50)
