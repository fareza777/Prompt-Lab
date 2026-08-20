from docx import Document
p=r"C:\Users\FAJAR\Downloads\25dc836e-ca67-4aeb-a3c1-0894d682626b.docx"
d=Document(p)
for i,x in enumerate(d.paragraphs):
    if x.text.strip():
        print(i, "style", x.style.name if x.style else None, "runs", len(x.runs), [(r.text, r.bold, r.italic, r.font.name, r.font.size.pt if r.font.size else None) for r in x.runs])
print("sections", len(d.sections))
for s in d.sections:
    print("margins",s.top_margin.inches,s.bottom_margin.inches,s.left_margin.inches,s.right_margin.inches,"size",s.page_width.inches,s.page_height.inches)
