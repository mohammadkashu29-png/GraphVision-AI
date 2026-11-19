# GraphVision AI paper figures

These eight PNGs were created from the architecture and numerical results present in the uploaded paper/project archive.

| Figure | File | Basis and interpretation |
|---|---|---|
| 1 | `fig1_architecture.png` | Conceptual architecture based on the modules described in the paper. |
| 2 | `fig2_workflow.png` | Conceptual processing workflow based on the implementation description. |
| 3 | `fig3_preprocessing_schematic.png` | Explicitly illustrative schematic, not participant handwriting or a real preprocessing result. Replace with a real before/after image pair when available. |
| 4 | `fig4_feature_extraction.png` | Conceptual feature-extraction diagram, not a measured sample. |
| 5 | `fig5_personality_workflow.png` | Heuristic association workflow described in the paper. |
| 6 | `fig6_wordspace_results.png` | Uses the reported 50-sample results: 26 exact matches, 24 non-exact matches, 52% agreement, MAE 0.68. |
| 7 | `fig7_pilot_quality.png` | Uses the audited 25-participant quality counts: 14 blurry, 3 show-through, 1 segmentation concern, 7 reliable. |
| 8 | `fig8_feature_inventory.png` | Lists the eight feature descriptors. It is not a per-sample heatmap. |

The ZIP did not contain original handwriting images, per-sample 50-image experiment results, or the correlation matrix values. Therefore, Figures 3 and 4 are labelled as schematics, and the unsupported correlation-matrix/standardised-heatmap claims were replaced in the filled PDF with an audited pilot-quality figure and an eight-feature inventory. Do not relabel these schematics as real experimental outputs.

## LaTeX insertion pattern

```latex
\begin{figure}[htbp]
    \centering
    \includegraphics[width=\columnwidth]{paper_figures/fig1_architecture.png}
    \caption{Overall architecture of the GraphVision AI framework.}
    \label{fig:architecture}
\end{figure}
```

Use the matching PNG and caption for each figure. Include `\usepackage{graphicx}` in the preamble.
