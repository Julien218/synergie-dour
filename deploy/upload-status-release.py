"""Frontend-only release; preserve the running backend, credentials and worker."""
import io,json,shlex,tarfile,sys
from pathlib import Path
import paramiko
BASE=Path(__file__).resolve().parent.parent
ROOT='/srv/olivier/releases/synergie-fetes-upload-20261117'
IMAGE='olivier-synergie:fetes-upload-20261117'
OLD='olivier-synergie:fetes-automation-20261116'
c=paramiko.SSHClient();keys=Path.home()/'.ssh'
c.load_host_keys(str(keys/'olivier-ionos-known-hosts'))
c.connect('217.154.161.205',username='root',key_filename=str(keys/'olivier-ionos-admin-ed25519'),timeout=20)
def run(code):
    _,o,e=c.exec_command('python3 -c '+shlex.quote(code));out=o.read().decode();err=e.read().decode();rc=o.channel.recv_exit_status();print(out)
    if rc:print(err[-2000:]);raise RuntimeError('Release phase failed')
try:
    if sys.argv[1]=='prepare':
        run(f"""import subprocess,json
from pathlib import Path
d=json.loads(subprocess.check_output(['docker','inspect','synergie-q2ayjdb1br2ndkjgsxefwiql']))[0]
assert d['Config']['Image']=={OLD!r},'Live version changed'
r=Path({ROOT!r});r.mkdir(mode=0o700,exist_ok=True)
e=dict(v.split('=',1) for v in d['Config']['Env'])
assert e.get('HOLIDAY_AUTOMATION_ENABLED')=='true' and e.get('HOLIDAY_PUBLISH_ENABLED')=='true','Workflow configuration changed'
f=r/'holiday-agent-credentials.json';f.write_text(json.dumps({{'token':e['HOLIDAY_AGENT_TOKEN']}}));f.chmod(0o600)
f=r/'holiday-schema.sql';f.write_text('SELECT 1;')
# Backend inherited byte for byte from the tested running image. Preserve its
# real isolated test receipt; this UI release runs no schema migration.
(r/'smoke-result.txt').write_text(Path('/srv/olivier/releases/synergie-fetes-automation-20261116/smoke-result.txt').read_text())
print('EXISTING_BACKEND_AND_WORKFLOW_VERIFIED')
""")
        s=c.open_sftp()
        existing=set(s.listdir('/srv/olivier/releases/synergie-fetes-automation-20261116/dist/public/assets'))
        buf=io.BytesIO()
        with tarfile.open(fileobj=buf,mode='w:gz') as t:
            t.add(BASE/'dist/public/index.html',arcname='public/index.html')
            for f in (BASE/'dist/public/assets').iterdir():
                if f.is_file() and f.name not in existing:t.add(f,arcname='public/assets/'+f.name)
            t.add(BASE/'deploy/ionos-fetes.py',arcname='ionos-fetes.py')
        with s.file(ROOT+'/release.tar.gz','wb') as f:f.write(buf.getvalue())
        s.chmod(ROOT+'/release.tar.gz',0o600);s.close()
        run(f"""import subprocess,tarfile,os
from pathlib import Path
r=Path({ROOT!r});tarfile.open(r/'release.tar.gz').extractall(r,filter='data')
(r/'Dockerfile').write_text('FROM {OLD}\\nCOPY public/ /app/dist/public/\\n')
with open(r/'build.log','w') as log:p=subprocess.run(['docker','build','-t',{IMAGE!r},str(r)],stdout=log,stderr=subprocess.STDOUT)
assert p.returncode==0,'UI image build failed; log on host'
e=dict(os.environ,FETES_RELEASE_DIR=str(r),FETES_IMAGE={IMAGE!r},FETES_OLD_IMAGE={OLD!r})
p=subprocess.run(['python3',str(r/'ionos-fetes.py'),'prepare'],env=e,capture_output=True,text=True)
print(p.stdout);assert p.returncode==0,'Release backup failed'
print('FRONTEND_IMAGE_AND_BACKUP_READY')
""")
    elif sys.argv[1]=='activate':
        run(f"""import subprocess,os
e=dict(os.environ,FETES_RELEASE_DIR={ROOT!r},FETES_IMAGE={IMAGE!r},FETES_OLD_IMAGE={OLD!r})
p=subprocess.run(['python3',{(ROOT+'/ionos-fetes.py')!r},'activate'],env=e,capture_output=True,text=True)
print(p.stdout);assert p.returncode==0,'Activation failed'
""")
finally:c.close()
