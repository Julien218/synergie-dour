"""Operator utility: pinned SSH hosts, protected credentials, no secrets in output."""
import io,json,os,secrets,shlex,sys,tarfile
from pathlib import Path
import paramiko
BASE=Path(__file__).resolve().parent.parent
KEYS=Path.home()/'.ssh'
OLROOT='/srv/olivier/releases/synergie-fetes-automation-20261116'
JSROOT='/srv/jsinnovia/releases/synergie-holiday-agent-20261116'
def connect(kind):
    c=paramiko.SSHClient()
    if kind=='ol': host,known,key='217.154.161.205','olivier-ionos-known-hosts','olivier-ionos-admin-ed25519'
    else: host,known,key='31.70.173.171','jsinnovia-known-hosts','jsinnovia-ionos-cockpit-ed25519'
    c.load_host_keys(str(KEYS/known));c.connect(host,username='root',key_filename=str(KEYS/key),timeout=20);return c
def run(c,code):
    _,out,err=c.exec_command('python3 -c '+shlex.quote(code));s=out.read().decode('utf-8','replace');e=err.read().decode('utf-8','replace');rc=out.channel.recv_exit_status()
    print(s)
    if rc: print(e[-3000:]);raise RuntimeError('Remote phase failed')
def upload(c,target,files):
    buf=io.BytesIO()
    with tarfile.open(fileobj=buf,mode='w:gz') as t:
        for src,dst in files:t.add(src,arcname=dst)
    s=c.open_sftp()
    try:s.mkdir(target,0o700)
    except OSError:pass
    with s.file(target+'/release.tar.gz','wb') as f:f.write(buf.getvalue())
    s.chmod(target+'/release.tar.gz',0o600);s.close()
    run(c,"import tarfile;tarfile.open("+repr(target+'/release.tar.gz')+").extractall("+repr(target)+",filter='data');print('RELEASE_UPLOADED')")
phase=sys.argv[1]
if phase=='upload':
    ol,js=connect('ol'),connect('js')
    try:
        files=[(BASE/'dist','dist'),(BASE/'deploy','deploy'),(BASE/'drizzle/0009_holiday_campaign.sql','holiday-schema-base.sql')]
        # Discover the two migration names instead of relying on a generated journal.
        files=[x for x in files if x[0].exists()]
        files.extend([(next((BASE/'drizzle').glob('0009*')),'holiday-schema-base.sql'),(next((BASE/'drizzle').glob('0010*')),'holiday-public-schema.sql'),(next((BASE/'drizzle').glob('0011*')),'holiday-automation-schema.sql'),(next((BASE/'drizzle').glob('0011*')),'holiday-schema.sql')])
        upload(ol,OLROOT,files)
        upload(js,JSROOT,[(BASE/'deploy/holiday-agent','agent'),(BASE/'client/public/logo-fetes-transparent.png','agent/logo.png')] if (BASE/'client/public/logo-fetes-transparent.png').exists() else [(BASE/'deploy/holiday-agent','agent'),(BASE/'client/public/logo-transparent.png','agent/logo.png')])
        # Read only the Synergie Page token; do not copy the shared user token or
        # credentials for any other account. Output is consumed in memory only.
        code="const {socialAccounts}=require('/app/server-social-accounts.cjs');(async()=>{const a=(await socialAccounts().metaPages({})).find(p=>p.pageId==='1109324298929601'&&p.canPublish);if(!a)process.exit(2);console.log('HOLIDAY_CREDENTIALS:'+JSON.stringify({pageToken:a.pageToken,voice:process.env.WAVESPEED_API_KEY,version:process.env.META_GRAPH_VERSION||'v23.0'}));})();"
        _,o,e=js.exec_command('docker exec jsinnovia-production-candidate-cockpit-1 node -e '+shlex.quote(code));raw=o.read().decode();rc=o.channel.recv_exit_status()
        if rc:raise RuntimeError('Synergie credentials unavailable')
        values=json.loads(next(s.split(':',1)[1] for s in raw.splitlines() if s.startswith('HOLIDAY_CREDENTIALS:')))
        s=ol.open_sftp()
        try:
            with s.file(OLROOT+'/holiday-agent-credentials.json','r') as f: token=json.loads(f.read())['token']
        except OSError:
            token=secrets.token_hex(32)
            with s.file(OLROOT+'/holiday-agent-credentials.json','w') as f:f.write(json.dumps({'token':token}))
            s.chmod(OLROOT+'/holiday-agent-credentials.json',0o600)
        s.close()
        env={'HOLIDAY_AGENT_TOKEN':token,'HOLIDAY_FACEBOOK_PAGE_TOKEN':values['pageToken'],'WAVESPEED_API_KEY':values['voice'],'META_GRAPH_VERSION':values['version'],'NODE_OPTIONS':''}
        s=js.open_sftp()
        with s.file(JSROOT+'/agent-env.json','w') as f:f.write(json.dumps(env))
        s.chmod(JSROOT+'/agent-env.json',0o600);s.close()
        print('SCOPED_AGENT_CREDENTIALS_PREPARED')
    finally:ol.close();js.close()
elif phase=='build-worker':
    c=connect('js')
    try:run(c,f"""import subprocess,os
os.chdir({JSROOT!r})
with open('build.log','w') as log:r=subprocess.run(['docker','build','-t','jsinnovia-synergie-holiday:20261116','agent'],stdout=log,stderr=subprocess.STDOUT)
if r.returncode:print(open('build.log').read()[-3000:]);raise SystemExit(1)
print('WORKER_IMAGE_BUILT')
""")
    finally:c.close()
elif phase=='build-site':
    c=connect('ol')
    try:run(c,f"""import subprocess,os
os.chdir({OLROOT!r})
with open('build.log','w') as log:r=subprocess.run(['docker','build','-f','deploy/Dockerfile.fetes','-t','olivier-synergie:fetes-automation-20261116','.'],stdout=log,stderr=subprocess.STDOUT)
if r.returncode:print(open('build.log').read()[-3000:]);raise SystemExit(1)
print('SITE_IMAGE_BUILT')
""")
    finally:c.close()
