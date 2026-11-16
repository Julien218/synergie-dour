"""Synthetic renderer test only. No merchant image or paid voice provider."""
from pathlib import Path
import json,subprocess,os
from PIL import Image, ImageDraw, ImageFont
p=Path('/work/9000001');p.mkdir(parents=True,exist_ok=True)
files=[]
for i,color in enumerate(['#196773','#902d41','#88621d','#414a7a']):
    f=p/f'{i}.png';im=Image.new('RGB',(1200,900),color)
    d=ImageDraw.Draw(im);d.rectangle((80,80,1120,820),outline='white',width=10)
    d.text((160,400),f'TEST TECHNIQUE - IMAGE {i+1} - NON PUBLIE',fill='white',font=ImageFont.truetype('/app/tools/synergie-video/fonts/Montserrat-700.ttf',36))
    im.save(f);files.append(dict(path=str(f),mime='image/png'))
manifest=dict(businessName='TEST TECHNIQUE · NON PUBLIÉ',activity='Démonstration isolée',files=files,voiceover='Démonstration technique sans publication')
(p/'manifest.json').write_text(json.dumps(manifest))
subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=440:duration=24','-y',str(p/'voice.wav')],check=True)
words=[dict(w=w,s=i*4,e=i*4+3.5) for i,w in enumerate(['TEST','TECHNIQUE','SANS','VOIX','RÉELLE','NON PUBLIÉ'])]
(p/'align.json').write_text(json.dumps(dict(duration=24,words=words)))
subprocess.run(['python3','/opt/holiday/render.py',str(p)],check=True)
canvas=Image.new('RGB',(4*270,2*480),'white')
for i in range(8):
    im=Image.open(p/f'qa-{i}.jpg');im.thumbnail((270,480));canvas.paste(im,((i%4)*270,(i//4)*480))
canvas.save(p/'contact-sheet.jpg')
print('SYNTHETIC_RENDER_NO_PAID_PROVIDER_PASSED')
