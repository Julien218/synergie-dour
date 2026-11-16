"""Run on JS-Innov.IA host after site deployment. Does not restart Cockpit."""
import json,os,subprocess,time
from pathlib import Path
RELEASE=Path('/srv/jsinnovia/releases/synergie-holiday-agent-20261116')
ROOT=Path('/srv/jsinnovia/synergie-holiday-agent')
IMAGE='jsinnovia-synergie-holiday:20261116'
CONTAINER='jsinnovia-synergie-holiday-agent'
def command(args):
    p=subprocess.run(args,capture_output=True,text=True)
    if p.returncode:raise RuntimeError('Service command failed; inspect protected host logs')
    return p.stdout
assert json.loads(command(['docker','inspect','jsinnovia-production-candidate-cockpit-1']))[0]['Config']['Image']=='jsinnovia-cockpit:2b53f88','Cockpit changed; recheck dependencies'
assert 'SYNTHETIC_RENDER_NO_PAID_PROVIDER_PASSED' in (RELEASE/'render-test.log').read_text(),'Renderer test required'
ROOT.mkdir(exist_ok=True,mode=0o700);ROOT.chmod(0o700)
work=ROOT/'work';work.mkdir(exist_ok=True,mode=0o700);work.chmod(0o700);os.chown(work,1000,1000)
env=json.loads((RELEASE/'agent-env.json').read_text())
assert all(env.get(k) for k in ['HOLIDAY_AGENT_TOKEN','HOLIDAY_FACEBOOK_PAGE_TOKEN','WAVESPEED_API_KEY'])
spec={'services':{'holiday-agent':{'image':IMAGE,'container_name':CONTAINER,'restart':'unless-stopped','environment':env,'volumes':[str(work)+':/work'],'read_only':True,'tmpfs':['/tmp:rw,noexec,nosuid,size=512m'],'cap_drop':['ALL'],'security_opt':['no-new-privileges:true'],'mem_limit':'2g','cpus':2,'pids_limit':256,'logging':{'driver':'json-file','options':{'max-size':'5m','max-file':'3'}}}}}
target=ROOT/'compose.json'
if target.exists():raise RuntimeError('Existing worker configuration must be reviewed before replacement')
target.write_text(json.dumps(spec,indent=2));target.chmod(0o600)
command(['docker','compose','-p','synergie-holiday-agent','-f',str(target),'config','--quiet'])
command(['docker','compose','-p','synergie-holiday-agent','-f',str(target),'up','-d'])
time.sleep(4)
d=json.loads(command(['docker','inspect',CONTAINER]))[0]
assert d['State']['Running'] and d['Config']['Image']==IMAGE
assert not d['HostConfig']['PortBindings'],'Worker must have no public port'
receipt={'image':IMAGE,'container':CONTAINER,'running':True,'ports':[],'createdAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
(RELEASE/'activation-receipt.json').write_text(json.dumps(receipt,indent=2))
print('PRIVATE_CAMPAIGN_WORKER_STARTED')
