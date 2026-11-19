import io

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .feature_meta import feature_rows

DISCLAIMER = ("These values describe measurable image characteristics only. They are NOT validated indicators of "
              "personality, intelligence, emotional state, or any psychological characteristic.")

LIMITATIONS = [
    "Pixel-based measurements depend on image resolution, scale, illumination, and preprocessing.",
    "Ruling-line removal may also remove or distort handwriting strokes that overlap ruling lines.",
    "Candidate word gaps are not guaranteed to correspond to actual word boundaries.",
    "The baseline-related angle is a preliminary line-position trend estimate, not a validated slant measurement.",
    "Evaluation sets are small; results should not be interpreted as population-level estimates.",
]


def handwriting_csv_bytes(data: dict) -> bytes:
    rows = feature_rows(data.get("features", {}))
    df = pd.DataFrame([{
        "Feature": r["name"],
        "Value": "" if r["value"] is None else r["value"],
        "Unit": r["unit"],
        "Definition": r["formula"],
        "Description": r["explanation"],
    } for r in rows])
    pre = data.get("preprocessing", {})
    meta_df = pd.DataFrame([
        {"Feature": "Source file", "Value": data.get("filename", ""), "Unit": "", "Definition": "", "Description": ""},
        {"Feature": "Image size", "Value": f'{data.get("width")}x{data.get("height")} px', "Unit": "", "Definition": "", "Description": ""},
        {"Feature": "Processing time", "Value": data.get("processing_time_ms"), "Unit": "ms", "Definition": "", "Description": ""},
        {"Feature": "Otsu threshold", "Value": pre.get("otsu_threshold"), "Unit": "gray level", "Definition": "", "Description": ""},
        {"Feature": "Ruling-line pixels removed", "Value": pre.get("ruling_line_pixels_removed"), "Unit": "px", "Definition": "", "Description": ""},
        {"Feature": "Noise components removed", "Value": pre.get("components_removed"), "Unit": "components", "Definition": "", "Description": ""},
        {"Feature": "DISCLAIMER", "Value": DISCLAIMER, "Unit": "", "Definition": "", "Description": ""},
    ])
    return pd.concat([meta_df, df], ignore_index=True).to_csv(index=False).encode("utf-8")


def handwriting_pdf_bytes(data: dict, analysis_id=None, created_at=None) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm,
                            title="GraphVision AI — Handwriting Analysis Report")
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("T", parent=styles["Title"], fontSize=17,
                                 textColor=colors.HexColor("#312e81"), spaceAfter=2 * mm)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=12,
                        textColor=colors.HexColor("#312e81"), spaceBefore=5 * mm, spaceAfter=2 * mm)
    small = ParagraphStyle("S", parent=styles["Normal"], fontSize=8, leading=11,
                           textColor=colors.HexColor("#475569"))

    pre = data.get("preprocessing", {})
    meta_table = Table(
        [["Analysis ID", str(analysis_id) if analysis_id is not None else "-"],
         ["Source file", data.get("filename", "-")],
         ["Analyzed at", created_at or "-"],
         ["Image size", f'{data.get("width")} x {data.get("height")} px'],
         ["Processing time", f'{data.get("processing_time_ms")} ms'],
         ["Otsu threshold", str(pre.get("otsu_threshold"))],
         ["Ruling-line pixels removed", str(pre.get("ruling_line_pixels_removed"))],
         ["Noise components removed", str(pre.get("components_removed"))]],
        colWidths=[55 * mm, 110 * mm])
    meta_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EEF2FF")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))

    feat_rows = [["Feature", "Value", "Unit", "Description"]] + [
        [r["name"], "—" if r["value"] is None else r["value"], r["unit"],
         Paragraph(r["explanation"], small)]
        for r in feature_rows(data.get("features", {}))
    ]
    feat_table = Table(feat_rows, colWidths=[38 * mm, 20 * mm, 24 * mm, 83 * mm], repeatRows=1)
    feat_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#C7D2FE")),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))

    story = [
        Paragraph("GraphVision AI — Handwriting Analysis Report", title_style),
        Paragraph("Pipeline: grayscale conversion → Otsu binarization → morphological ruling-line handling → "
                  "connected-component noise filtering → eight-feature extraction.", small),
        Spacer(1, 4 * mm),
        Paragraph("Analysis Metadata", h2), meta_table,
        Paragraph("Extracted Features", h2), feat_table,
        Paragraph("Limitations", h2),
        *[Paragraph(f"• {t}", small) for t in LIMITATIONS],
        Spacer(1, 3 * mm),
        Paragraph(DISCLAIMER, ParagraphStyle("D", parent=small, textColor=colors.HexColor("#B91C1C"))),
    ]
    doc.build(story)
    return buf.getvalue()
