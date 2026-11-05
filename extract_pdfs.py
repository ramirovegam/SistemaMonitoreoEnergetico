from pypdf import PdfReader
for f in ['C:/Users/DTIC1/Downloads/HSD_extracted/HSD/evaluacionpractica2026btopicos.pdf', 'C:/Users/DTIC1/Downloads/HSD_extracted/HSD/Rubrica2026b.pdf']:
    print('===FILE===' + f)
    try:
        reader = PdfReader(f)
        print('PAGES=' + str(len(reader.pages)))
        for i,p in enumerate(reader.pages):
            print('===PAGE'+str(i)+'===')
            print(p.extract_text())
    except Exception as e:
        print(e)
    print('\n' + '='*60 + '\n')
