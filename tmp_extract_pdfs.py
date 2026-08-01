from pypdf import PdfReader
from pathlib import Path
for path in [Path('Pulse_Platform_Documentation_Final.pdf'), Path('Pulse_Technical_Operations_Security_Appendix (1).pdf')]:
    print(f'=== {path.name} ===')
    reader = PdfReader(str(path))
    text = '\n'.join(page.extract_text() or '' for page in reader.pages)
    print(text[:20000])
    print('\n')
