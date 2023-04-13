//@ts-check
const fs = require('fs');
const AdmZip = require('adm-zip');
const backupPath = `./backups/`;
const logsPath = `./logs/`;
const databasePath = `./database/`;
const addonPath = `./addons/`;

const {StorageManager, Console} = Bot;

function checkBackupTime() {
    var currentTime = Date.now();
    if (!fs.existsSync(databasePath + 'global.json')) fs.writeFileSync(databasePath + 'global.json', `{"backupTime": 0}`);
    var backupTime = StorageManager.globalGet('backupTime');
    if (currentTime > backupTime + 24 * 60 * 60 * 1000) {
        StorageManager.globalSet('backupTime', Date.now());
        takeBackup();
    }
}

function takeBackup() {
    let time = new Date();
    const file = new AdmZip();
    file.addLocalFolder(logsPath, 'logs');
    file.addLocalFolder(databasePath, 'database');
    file.addLocalFolder(addonPath, 'addons');
    fs.writeFileSync(`${backupPath}Backup-${time.getFullYear()}.${time.getMonth() + 1}.${time.getDate()}.zip`, file.toBuffer());
    Console.log('Backup taken', null);
}

checkBackupTime();
setInterval(checkBackupTime, 60 * 60 * 1000);
