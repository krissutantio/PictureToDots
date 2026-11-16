"""Generate shared vector glyphs from a locally supplied DejaVu Sans font.
Usage: python generate-symbols.py /path/to/DejaVuSans.ttf
Requires fonttools. Generated files are committed; the app/build needs no font service.
"""
import sys,json,unicodedata
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
font=TTFont(sys.argv[1]);glyphs=font.getGlyphSet();cmap=font.getBestCmap()
chars='ACDEFHJKLMNPRTUVWXY123456789★◆▲▼◀▶●■✚♥♠♣☀☁☂⚑⚓♪✿❄⌘⌂↑↓←→↗↙⊕⊗∞πΩ'
result={}
for char in chars:
 glyph=glyphs[cmap[ord(char)]];bounds=BoundsPen(glyphs);glyph.draw(bounds)
 x0,y0,x1,y1=bounds.bounds;scale=1/max(x1-x0,y1-y0)
 width=(x1-x0)*scale;height=(y1-y0)*scale
 pen=SVGPathPen(glyphs,ntos=lambda n:format(n,'.5f').rstrip('0').rstrip('.') or '0')
 transform=TransformPen(pen,(scale,0,0,-scale,(1-width)/2-x0*scale,(1-height)/2+y1*scale));glyph.draw(transform)
 result[char]={'name':unicodedata.name(char),'path':pen.getCommands()}
Path('src/reference-symbols.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
license=next(n.toUnicode() for n in font['name'].names if n.nameID==13)
Path('public/licenses').mkdir(exist_ok=True)
Path('public/licenses/ReferenceSymbols.txt').write_text('Reference Symbols: vector glyph subset derived from DejaVu Sans.\n\n'+license+'\n')
print(f'Generated {len(result)} unique vector glyphs')
