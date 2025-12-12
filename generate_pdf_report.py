from fpdf import FPDF
import re
import os

class AnalysisPDF(FPDF):
    def header(self):
        self.set_font("helvetica", "B", 12)
        self.cell(0, 10, "MediFusion Project Analysis", border=False, new_x="Lmargin", new_y="NEXT", align="C")
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

def parse_markdown_table(lines):
    # Extract table rows
    rows = []
    # Header
    header_line = lines[0].strip()
    headers = [h.strip() for h in header_line.strip("|").split("|")]
    rows.append(headers)
    
    # Skip separator line (lines[1])
    
    # Body
    for line in lines[2:]:
        if not line.strip().startswith("|"):
            continue
        cols = [c.strip() for c in line.strip("|").split("|")]
        rows.append(cols)
    return rows

def create_pdf(md_path, output_path):
    pdf = AnalysisPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    lines = content.split("\n")
    
    # Fonts
    pdf.set_font("helvetica", "", 11)
    
    i = 0
    in_code_block = False
    
    while i < len(lines):
        line = lines[i]
        
        # Code Block
        if line.strip().startswith("```"):
            if not in_code_block:
                in_code_block = True
                pdf.set_font("courier", "", 10)
                pdf.set_fill_color(240, 240, 240)
                pdf.ln(2)
            else:
                in_code_block = False
                pdf.set_font("helvetica", "", 11)
                pdf.ln(2)
            i += 1
            continue
            
        if in_code_block:
            pdf.multi_cell(0, 5, line, fill=True, border=False)
            i += 1
            continue
            
        # H1
        if line.startswith("# "):
            pdf.set_font("helvetica", "B", 20)
            pdf.ln(5)
            pdf.multi_cell(0, 10, line[2:])
            pdf.set_font("helvetica", "", 11)
            pdf.ln(2)
            i += 1
            continue
            
        # H2
        if line.startswith("## "):
            pdf.set_font("helvetica", "B", 16)
            pdf.ln(5)
            pdf.cell(0, 10, line[3:], new_x="Lmargin", new_y="NEXT")
            pdf.set_font("helvetica", "", 11)
            pdf.ln(2)
            i += 1
            continue
            
        # H3
        if line.startswith("### "):
            pdf.set_font("helvetica", "B", 14)
            pdf.ln(3)
            pdf.cell(0, 8, line[4:], new_x="Lmargin", new_y="NEXT")
            pdf.set_font("helvetica", "", 11)
            i += 1
            continue
            
        # Table detection (starts with |)
        if line.strip().startswith("|"):
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i])
                i += 1
            
            # Process table
            if table_lines:
                table_data = parse_markdown_table(table_lines)
                pdf.ln(2)
                # Render table
                with pdf.table() as table:
                    for data_row in table_data:
                        row = table.row()
                        for datum in data_row:
                            row.cell(datum)
                pdf.ln(2)
            continue
            
        # List items
        if line.strip().startswith("- "):
            # Check indentation
            indent = len(line) - len(line.lstrip())
            text = line.strip()[2:]
            
            # Simple bullet handling
            pdf.set_x(pdf.l_margin + indent + 2)
            pdf.circle(pdf.get_x() - 4, pdf.get_y() + 2, 1, 'F')
            pdf.multi_cell(0, 5, text)
            pdf.ln(1)
            i += 1
            continue
            
        # Numbered list
        if re.match(r"^\d+\.", line.strip()):
            pdf.ln(1)
            pdf.multi_cell(0, 5, line.strip())
            i += 1
            continue

        # Normal text (paragraph)
        if line.strip():
            pdf.multi_cell(0, 5, line.strip())
            pdf.ln(1)
        
        i += 1

    pdf.output(output_path)
    print(f"PDF created at: {output_path}")

if __name__ == "__main__":
    MD_FILE = r"C:\Users\adith\.gemini\antigravity\brain\03003b52-d3e9-4295-a79b-1c75832c8226\project_analysis.md"
    PDF_FILE = r"C:\Users\adith\Desktop\Medifusion\project_analysis.pdf"
    try:
        create_pdf(MD_FILE, PDF_FILE)
    except Exception as e:
        print(f"Error: {e}")
