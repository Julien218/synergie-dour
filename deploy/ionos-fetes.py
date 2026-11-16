"""Run on the existing Synergie host as root; never prints credentials."""
import json, os, secrets, shutil, subprocess, sys, time, urllib.request
from pathlib import Path
from urllib.parse import urlparse, unquote
import yaml

ROOT=Path(os.environ.get('FETES_RELEASE_DIR','/srv/olivier/releases/synergie-fetes-public-20261116'))
COMPOSE=Path('/data/coolify/services/q2ayjdb1br2ndkjgsxefwiql/docker-compose.yml')
UUID='q2ayjdb1br2ndkjgsxefwiql'
CONTAINER='synergie-'+UUID
IMAGE=os.environ.get('FETES_IMAGE','olivier-synergie:fetes-public-form-20261116')
OLD_IMAGE=os.environ.get('FETES_OLD_IMAGE','olivier-synergie:fetes-20261116')
PRIVATE=Path('/srv/olivier/data/synergie-holiday/uploads')
BACKUP=ROOT/'backup-before-launch'

def command(args, data=None, env=None):
    p=subprocess.run(args,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env)
    if p.returncode: raise RuntimeError('Command failed: '+args[0]+' (details retained on host)')
    return p.stdout.decode()

def psql(sql):return command(['docker','exec','-i','coolify-db','psql','-U','coolify','-d','coolify','-At','-v','ON_ERROR_STOP=1'],sql.encode())
def inspect():return json.loads(command(['docker','inspect',CONTAINER]))[0]
def env_values():return dict(v.split('=',1) for v in inspect()['Config']['Env'])
def private_write(p, value):
    p.write_text(value);p.chmod(0o600)
def changes(spec):
    s=spec['services']['synergie'];s['image']=IMAGE
    e=s.get('environment',{})
    if isinstance(e,list):e=dict(v.split('=',1) for v in e)
    e.update(HOLIDAY_CAMPAIGN_ENABLED='true',HOLIDAY_UPLOAD_DIR='/var/lib/synergie-holiday/uploads',HOLIDAY_CLAMSCAN='/usr/local/bin/holiday-scan',HOLIDAY_JULIEN_USER_ID='2',HOLIDAY_OLIVIER_USER_ID='3')
    s['environment']=e
    volumes=s.get('volumes') or []
    if not any(isinstance(v,dict) and v.get('target')=='/var/lib/synergie-holiday/uploads' for v in volumes):
        volumes.append({'type':'bind','source':str(PRIVATE),'target':'/var/lib/synergie-holiday/uploads','read_only':False})
    s['volumes']=volumes
    return spec

def prepare():
    assert inspect()['Config']['Image']==OLD_IMAGE, 'Live version changed; stop.'
    if BACKUP.exists():raise RuntimeError('Preparation backup already exists; inspect before retry.')
    BACKUP.mkdir(mode=0o700)
    shutil.copy2(COMPOSE,BACKUP/'docker-compose.yml');(BACKUP/'docker-compose.yml').chmod(0o600)
    original=json.loads(psql("SELECT row_to_json(s) FROM services s WHERE uuid='"+UUID+"';"))
    private_write(BACKUP/'coolify-service.json',json.dumps(original))
    # Consistent logical backup via existing application credentials, never in argv.
    u=urlparse(env_values()['DATABASE_URL']);backup=BACKUP/'mysql-before-launch.sql'
    f=os.open(backup,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(f,'wb') as out:
        p=subprocess.run(['docker','exec','-e','MYSQL_PWD','olivier-synergie-db','mysqldump','--host=127.0.0.1','--user='+unquote(u.username),'--single-transaction','--no-tablespaces','--skip-lock-tables','--set-gtid-purged=OFF',u.path.lstrip('/')],env=dict(os.environ,MYSQL_PWD=unquote(u.password)),stdout=out,stderr=subprocess.PIPE)
    if p.returncode or backup.stat().st_size<100:raise RuntimeError('Database backup failed; stop.')
    rendered=json.loads(command(['docker','compose','-f',str(COMPOSE),'config','--format','json']))
    raw=yaml.safe_load(original['docker_compose_raw'])
    PRIVATE.mkdir(parents=True,exist_ok=True,mode=0o700);PRIVATE.chmod(0o700)
    private_write(ROOT/'next-compose.json',json.dumps(changes(rendered),indent=2))
    private_write(ROOT/'next-source-compose.json',json.dumps(changes(raw),indent=2))
    command(['docker','compose','-f',str(ROOT/'next-compose.json'),'config','--quiet'])
    print('BACKUP_AND_DEPLOYMENT_PREPARATION_PASSED')

def activate():
    assert inspect()['Config']['Image']==OLD_IMAGE, 'Live version changed; stop.'
    assert (ROOT/'smoke-result.txt').read_text().count('_PASSED')>=2,'Real tests required.'
    assert (BACKUP/'mysql-before-launch.sql').stat().st_size>100
    ddl=(ROOT/'holiday-schema.sql').read_text()
    # The migration is additive. Existing membership and merchant data are preserved.
    js="""import mysql from 'mysql2/promise';const db=await mysql.createConnection({uri:process.env.DATABASE_URL.split('?')[0],ssl:{rejectUnauthorized:false}});try{const sql=Buffer.from(process.argv[1],'base64').toString();for(const q of sql.split(';').filter(s=>s.trim()))await db.query(q);const [r]=await db.query(\"SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('holiday_dossiers','holiday_jobs','holiday_files','holiday_events')\");if(r[0].count!==4)throw Error('Schema verification failed');console.log('FOUR_CAMPAIGN_TABLES_READY');}finally{await db.end();}"""
    import base64
    print(command(['docker','exec',CONTAINER,'node','--input-type=module','-e',js,base64.b64encode(ddl.encode()).decode()]).strip())
    next_compose=(ROOT/'next-compose.json').read_text();raw=(ROOT/'next-source-compose.json').read_text()
    delimiter='$fetes_'+secrets.token_hex(8)+'$'
    sql="BEGIN; UPDATE services SET docker_compose_raw="+delimiter+raw+delimiter+", docker_compose="+delimiter+next_compose+delimiter+", updated_at=NOW() WHERE uuid='"+UUID+"'; COMMIT;"
    psql(sql)
    private_write(COMPOSE,next_compose)
    try:
        command(['docker','compose','-p',UUID,'-f',str(COMPOSE),'up','-d','--no-deps','synergie'])
        deadline=time.monotonic()+50
        while time.monotonic()<deadline:
            try:
                r=urllib.request.urlopen('https://www.synergiedour.be/health',timeout=5)
                if r.status==200 and inspect()['Config']['Image']==IMAGE:
                    print('PRODUCTION_HEALTHY_ON_NEW_IMAGE');return
            except Exception:pass
            time.sleep(2)
        raise RuntimeError('New version did not become healthy')
    except Exception:
        rollback();raise

def rollback():
    original=json.loads((BACKUP/'coolify-service.json').read_text())
    delimiter='$rollback_'+secrets.token_hex(8)+'$'
    psql("UPDATE services SET docker_compose_raw="+delimiter+original['docker_compose_raw']+delimiter+",docker_compose="+delimiter+original['docker_compose']+delimiter+",updated_at=NOW() WHERE uuid='"+UUID+"';")
    shutil.copy2(BACKUP/'docker-compose.yml',COMPOSE)
    command(['docker','compose','-p',UUID,'-f',str(COMPOSE),'up','-d','--no-deps','synergie'])
    print('PREVIOUS_APPLICATION_RESTORED; campaign data retained')

if __name__=='__main__':
    try:
        {'prepare':prepare,'activate':activate,'rollback':rollback}[sys.argv[1]]()
    except Exception as e:
        print(type(e).__name__+': '+str(e));sys.exit(1)
