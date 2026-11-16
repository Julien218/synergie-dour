#!/usr/bin/env python3
"""Real merchant assets, official transparent logo, restrained Christmas frame.
No stock footage, invented offers, source music, or generative replacement images.
The output stays a draft until a human watches and approves it.
"""
import hashlib, importlib.util, json, math, os, subprocess, sys, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

Image.MAX_IMAGE_PIXELS = 40_000_000
ROOT = Path(sys.argv[1]).resolve()
if ROOT.parent != Path('/work') or not ROOT.name.isdecimal():
    raise ValueError('Work directory refused')
os.chdir(ROOT)
manifest = json.loads((ROOT/'manifest.json').read_text())
FONTS = Path('/app/tools/synergie-video/fonts')
FONT = FONTS/'Montserrat-700.ttf'
LOGO = Path('/opt/holiday/logo.png')
W,H=1080,1920
NAVY=(0,26,61,255); GOLD=(212,175,55,255)

def run(args, timeout=300):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
def probe(p):
    return json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]).stdout)
def font(size): return ImageFont.truetype(str(FONT),size)
def fitted(draw,text,maxwidth,maxlines,size):
    text=' '.join(str(text).split())
    while size>=28:
        f=font(size); lines=[]; line=''
        for word in text.split():
            candidate=(line+' '+word).strip()
            if draw.textbbox((0,0),candidate,font=f)[2]>maxwidth and line:
                lines.append(line);line=word
            else:line=candidate
        if line:lines.append(line)
        if len(lines)<=maxlines and all(draw.textbbox((0,0),s,font=f)[2]<=maxwidth for s in lines):return lines,f
        size-=2
    raise ValueError('Merchant title requires manual editing')
def header():
    image=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(image)
    d.rounded_rectangle((40,120,1040,520),radius=32,fill=NAVY,outline=GOLD,width=3)
    logo=Image.open(LOGO).convert('RGBA');logo.thumbnail((630,180))
    image.alpha_composite(logo,((W-logo.width)//2,150))
    lines,f=fitted(d,manifest['businessName'],900,2,64)
    for i,line in enumerate(lines):d.text((540,365+i*72),line,font=f,anchor='mt',fill='white')
    # Pine needles, baubles and warm lights live in the frame, away from products.
    for side in [0,1]:
        for i in range(11):
            x=50+i*22;y=83+i*4
            if side:x=W-x
            dx=22 if not side else -22
            d.line((x,y,x+dx,y+52),fill=(30,102,67,255),width=7)
            d.line((x,y,x-dx,y+38),fill=(23,83,55,255),width=6)
        x=190 if not side else 890
        d.line((x,120,x,185),fill=GOLD,width=3)
        d.ellipse((x-22,182,x+22,226),fill=(157,32,47,255),outline=GOLD,width=3)
    d.rounded_rectangle((60,1600,1020,1740),radius=25,fill=NAVY,outline=GOLD,width=2)
    d.text((540,1630),'Fêtes 2026 · Achetons local',font=font(42),anchor='mt',fill=GOLD)
    d.text((540,1700),'synergiedour.be',font=font(30),anchor='mt',fill='white')
    d.text((540,1790),'Création JS-Innov.IA',font=font(23),anchor='mt',fill=(225,225,225,255))
    image.save('frame.png')

def sources():
    files=manifest['files']; checked=[]
    for f in files:
        p=Path(f['path']).resolve()
        if p.parent != ROOT:raise ValueError('Source outside job')
        if f['mime'].startswith('image/'):
            im=Image.open(p);im.verify();checked.append((p,'image',0))
        else:
            info=probe(p);v=next(s for s in info['streams'] if s['codec_type']=='video')
            duration=float(info['format']['duration'])
            if duration<3:continue
            checked.append((p,'video',duration))
    # Four different photos or enough real footage for four distinct selections.
    if len(checked)<4 and not any(t=='video' and dur>=15 for _,t,dur in checked):
        raise ValueError('At least four photos or fifteen seconds of real video required')
    if not LOGO.is_file() or not FONT.is_file():raise ValueError('Official brand assets missing')
    return checked

assets=sources()
if '--check' in sys.argv:
    header(); print('SOURCES_AND_BRAND_CHECKED');sys.exit(0)

align=json.loads(Path('align.json').read_text());duration=float(align['duration'])
if not 10<=duration<=59:raise ValueError('Voice duration requires editing')
header()
count=max(4,min(12,math.ceil(duration/4)))
span=duration/count
for i in range(count):
    p,kind,avail=assets[i%len(assets)]
    out=f'clip-{i:02d}.mp4'
    # Full image remains visible. Navy framing absorbs landscape/portrait differences.
    filters='scale=1000:970:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:570:color=0x001a3d,setsar=1,fps=30'
    if kind=='image':
        im=ImageOps.exif_transpose(Image.open(p)).convert('RGB');im.thumbnail((2000,2000));im.save(f'image-{i}.jpg')
        cmd=['ffmpeg','-v','error','-loop','1','-i',f'image-{i}.jpg']
    else:
        # Different offsets give a single longer supplied video distinct shots.
        offset=max(0,(avail-span)*((i//len(assets))%4)/3)
        cmd=['ffmpeg','-v','error','-ss',str(offset),'-i',str(p)]
    run(cmd+['-t',str(span),'-vf',filters,'-an','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-threads','2','-y',out],timeout=180)
Path('clips.txt').write_text(''.join(f"file 'clip-{i:02d}.mp4'\n" for i in range(count)))
run(['ffmpeg','-v','error','-f','concat','-safe','0','-i','clips.txt','-c','copy','-y','montage.mp4'])

# Reuse the existing voice-alignment and subtitle layout tools. Escape ASS control
# syntax from merchant-provided names/activity before rendering any words.
spec=importlib.util.spec_from_file_location('reel','/app/tools/synergie-video/reel_tiktok.py')
reel=importlib.util.module_from_spec(spec);spec.loader.exec_module(reel)
for word in align['words']:
    word['w']=word['w'].replace('\\','').replace('{','').replace('}','').replace('\n',' ')
reel.build_ass(align['words'],'Montserrat',duration,'captions.ass',set(),cap_y=1460)
run(['ffmpeg','-v','error','-i','montage.mp4','-i','voice.wav','-loop','1','-i','frame.png',
     '-filter_complex',"[0:v][2:v]overlay=0:0:shortest=1,ass=captions.ass:fontsdir=/app/tools/synergie-video/fonts[v];[1:a]loudnorm=I=-16:TP=-1.5:LRA=9[a]",
     '-map','[v]','-map','[a]','-t',str(duration),'-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-threads','2','-c:a','aac','-b:a','160k','-movflags','+faststart','-y','video.mp4'],timeout=600)
info=probe('video.mp4');v=next(s for s in info['streams'] if s['codec_type']=='video');a=next(s for s in info['streams'] if s['codec_type']=='audio')
if (v['width'],v['height'],v['codec_name'],a['codec_name'])!=(1080,1920,'h264','aac'):raise ValueError('Export refused')
run(['ffmpeg','-v','error','-xerror','-i','video.mp4','-f','null','-'],timeout=180)
if Path('video.mp4').stat().st_size>50*1024*1024:raise ValueError('Export too large')
for i,ratio in enumerate([0,.15,.30,.45,.60,.75,.90,.99]):
    run(['ffmpeg','-v','error','-ss',str(duration*ratio),'-i','video.mp4','-frames:v','1','-y',f'qa-{i}.jpg'])
canvas=Image.new('RGB',(4*270,2*480),'white')
for i in range(8):
    im=Image.open(f'qa-{i}.jpg');im.thumbnail((270,480));canvas.paste(im,((i%4)*270,(i//4)*480))
canvas.save('contact-sheet.jpg')
# This is technical QA only. Full audiovisual review belongs to Julien or Olivier.
Path('qa.json').write_text(json.dumps(dict(passed=True,width=1080,height=1920,duration=float(info['format']['duration']),audio=True,decoded=True,subtitles=True)))
print('DRAFT_RENDER_AND_TECHNICAL_QA_PASSED')
