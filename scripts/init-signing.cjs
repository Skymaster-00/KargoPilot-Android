// Creates a local signing identity once. Never commit .signing or print passwords.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const dir = path.resolve(__dirname,'../.signing');
fs.mkdirSync(dir,{recursive:true});
const key=path.join(dir,'release.jks');
if(fs.existsSync(key)){console.log('Existing release signing identity retained.');process.exit(0);}
const password=crypto.randomBytes(32).toString('hex');
const passwordFile=path.join(dir,'password.txt');
fs.writeFileSync(passwordFile,password,{mode:0o600});
const tool=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin',process.platform==='win32'?'keytool.exe':'keytool'):'keytool';
const result=spawnSync(tool,['-genkeypair','-keystore',key,'-storepass:file',passwordFile,'-keypass:file',passwordFile,'-alias','kargopilot','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=KargoPilot, OU=Android, O=KargoPilot, C=TR'],{stdio:'inherit'});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status||1);
fs.writeFileSync(path.join(dir,'signing.properties'),`storeFile=.signing/release.jks\nstorePassword=${password}\n`,{mode:0o600});
fs.writeFileSync(path.join(dir,'keystore-base64.txt'),fs.readFileSync(key).toString('base64'),{mode:0o600});
console.log('Local release signing identity created in ignored .signing directory.');
