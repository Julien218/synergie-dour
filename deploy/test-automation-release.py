import json,os,shlex,sys
from pathlib import Path
import paramiko
BASE=Path(__file__).resolve().parent.parent
K=Path.home()/'.ssh'
kind=sys.argv[1]
c=paramiko.SSHClient()
if kind=='render':host,known,key='31.70.173.171','jsinnovia-known-hosts','jsinnovia-ionos-cockpit-ed25519'
else:host,known,key='217.154.161.205','olivier-ionos-known-hosts','olivier-ionos-admin-ed25519'
c.load_host_keys(str(K/known));c.connect(host,username='root',key_filename=str(K/key),timeout=20)
try:
    s=c.open_sftp()
    if kind=='render':
        root='/srv/jsinnovia/releases/synergie-holiday-agent-20261116'
        for f in ['agent.cjs','render.py','test-fixture.py']:s.put(str(BASE/'deploy/holiday-agent'/f),root+'/agent/'+f)
        code=f"""import subprocess,os
from pathlib import Path
r=Path({root!r});w=r/'test-work';w.mkdir(exist_ok=True);w.chmod(0o700);os.chown(w,1000,1000)
args=['docker','run','--rm','--name','synergie-holiday-render-test','--network','none','--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=512m','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','2g','--cpus','2','-v',str(w)+':/work','-v',str(r/'agent')+':/opt/holiday:ro','--entrypoint','python3','jsinnovia-synergie-holiday:20261116','/opt/holiday/test-fixture.py']
with open(r/'render-test.log','w') as log:p=subprocess.run(args,stdout=log,stderr=subprocess.STDOUT)
if p.returncode:print((r/'render-test.log').read_text()[-3500:]);raise SystemExit(1)
print((r/'render-test.log').read_text()[-500:])
"""
    else:
        root='/srv/olivier/releases/synergie-fetes-automation-20261116'
        for name in ['holiday-smoke.mjs','automation-smoke.mjs']:s.put(str(BASE/'dist'/name),root+'/dist/'+name)
        code=f"""import subprocess,os,json
from pathlib import Path
from urllib.parse import quote
r=Path({root!r});v=json.loads(Path('/srv/olivier/releases/synergie-fetes-links-20261116/smoke-db-access.json').read_text())
db='holiday_test_automation'
env=dict(os.environ,MYSQL_PWD=v['password'])
sql=('DROP DATABASE IF EXISTS '+db+'; CREATE DATABASE '+db+';').encode()
q=subprocess.run(['docker','exec','-i','-e','MYSQL_PWD','synergie-holiday-test-db','mysql','-uroot'],input=sql,env=env,capture_output=True)
if q.returncode:raise SystemExit('Test database unavailable')
values=dict(DATABASE_URL='mysql://root:'+quote(v['password'],safe='')+'@'+v['host']+':3306/'+db,NODE_ENV='test',HOLIDAY_CAMPAIGN_ENABLED='true',HOLIDAY_UPLOAD_DIR='/test/uploads',HOLIDAY_CLAMSCAN='/usr/local/bin/holiday-scan',HOLIDAY_JULIEN_USER_ID='110011',HOLIDAY_OLIVIER_USER_ID='110022',JWT_SECRET='isolated-automation-test-secret-64-characters-no-real-credential',APP_URL='https://www.synergiedour.be')
e=r/'test.env';e.write_text(''.join(k+'='+val+'\\n' for k,val in values.items()));e.chmod(0o600)
w=r/'test-private';w.mkdir(exist_ok=True);w.chmod(0o700)
common=['docker','run','--rm','--network','olivier-synergie-private','--env-file',str(e),'-v',str(w)+':/test','-v',str(r/'holiday-schema-base.sql')+':/app/holiday-schema.sql:ro','-v',str(r/'holiday-public-schema.sql')+':/app/holiday-public-schema.sql:ro','-v',str(r/'holiday-automation-schema.sql')+':/app/holiday-automation-schema.sql:ro','-v',str(r/'dist/holiday-smoke.mjs')+':/app/holiday-smoke.mjs:ro','-v',str(r/'dist/automation-smoke.mjs')+':/app/automation-smoke.mjs:ro','-v',str(r/'test-proof.jpg')+':/app/test-proof.jpg:ro','-v',str(r/'test-video.mp4')+':/app/test-video.mp4:ro','olivier-synergie:fetes-automation-20261116']
output=[]
for script in ['holiday-smoke.mjs','automation-smoke.mjs']:
    p=subprocess.run(common+['node',script],capture_output=True,text=True)
    output.append(p.stdout+p.stderr)
    if p.returncode:(r/'smoke-result.txt').write_text('\\n'.join(output));print(output[-1][-3000:]);raise SystemExit(1)
(r/'smoke-result.txt').write_text('\\n'.join(output));print('\\n'.join(output)[-2200:])
"""
    s.close()
    _,o,e=c.exec_command('python3 -c '+shlex.quote(code));print(o.read().decode('utf-8','replace'));err=e.read().decode('utf-8','replace');rc=o.channel.recv_exit_status()
    if rc:print(err[-2000:]);raise SystemExit(rc)
finally:c.close()
