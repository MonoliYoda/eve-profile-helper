const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const eveDir = path.join(app.getPath('home'), 'AppData', 'Local', 'CCP', 'EVE');

// const tranquilityDir = path.join(eveDir, 'd_eve_sharedcache_tq_tranquility');
const tranquilityDir = path.join(eveDir, fs.readdirSync(eveDir).find(dir => dir.endsWith('_tq_tranquility')));
console.log('Tranquility dir:', tranquilityDir);

// const thunderdomeDir = path.join(eveDir, 'd_eve_sharedcache_thunderdome_thunderdome');
const thunderdomeDir = path.join(eveDir, fs.readdirSync(eveDir).find(dir => dir.endsWith('_thunderdome_thunderdome')));
console.log('Thunderdome dir:', thunderdomeDir);

const foldersToCheck = [
    fs.readdirSync(eveDir).find(dir => dir.endsWith('_tq_tranquility')),
    fs.readdirSync(eveDir).find(dir => dir.endsWith('_thunderdome_thunderdome'))
];

function checkDirectories() {
    for (const folder of foldersToCheck) {
        console.log('Checking folder:', folder);
        const folderPath = path.join(eveDir, folder);
        if (!fs.existsSync(folderPath)) {
            return { success: false, missingFolder: folder };
        }
    }
    return { success: true };
}

// Function to get last modified date of a file
function getLastModified(server, profile, fileName) {
    const serverDir = server === 'Tranquility' ? tranquilityDir : thunderdomeDir;
    const profileDir = path.join(serverDir, profile);
    const filePath = path.join(profileDir, fileName);

    return new Promise((resolve, reject) => {
        fs.stat(filePath, (err, stats) => {
            if (err) {
                console.error('Error getting file stats:', err);
                resolve('Unknown');
            } else {
                resolve(stats.mtime.toLocaleString());
            }
        });
    });
}

function getServerOptions() {
    const servers = [];
    if (fs.existsSync(tranquilityDir)) {
        servers.push('Tranquility');
    }
    if (fs.existsSync(thunderdomeDir)) {
        servers.push('Thunderdome');
    }
    console.log('Available servers:', servers);
    return servers;
}

function getProfileOptions(server) {
    const serverDir = server === 'Tranquility' ? tranquilityDir : thunderdomeDir;
    const profiles = fs.readdirSync(serverDir).filter(file => fs.lstatSync(path.join(serverDir, file)).isDirectory());
    console.log(`Profiles for ${server}:`, profiles);
    return profiles;
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools();
}

app.on('ready', () => {
    const checkResult = checkDirectories();
    if (!checkResult.success) {
        dialog.showErrorBox('Missing Folder', `The folder ${checkResult.missingFolder} does not exist in ${eveDir}.`);
        app.quit();
    } else {
        createWindow();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('getServerOptions', () => {
    const servers = getServerOptions();
    console.log('Server options sent to renderer:', servers);
    return servers;
});

ipcMain.handle('getProfileOptions', (event, server) => {
    const profiles = getProfileOptions(server);
    console.log('Profile options sent to renderer:', profiles);
    return profiles;
});

function copySettings(from, to) {
    const fromServerDir = from.server === 'Tranquility' ? tranquilityDir : thunderdomeDir;
    const toServerDir = to.server === 'Tranquility' ? tranquilityDir : thunderdomeDir;

    const fromProfileDir = path.join(fromServerDir, from.profile);
    const toProfileDir = path.join(toServerDir, to.profile);

    const fromAccountFile = path.join(fromProfileDir, `core_user_${from.account}.dat`);
    const toAccountFile = path.join(toProfileDir, `core_user_${to.account}.dat`);

    const fromCharacterFile = path.join(fromProfileDir, `core_char_${from.character}.dat`);
    const toCharacterFile = path.join(toProfileDir, `core_char_${to.character}.dat`);

    return new Promise((resolve, reject) => {
        fs.copyFile(fromAccountFile, toAccountFile, (err) => {
            if (err) return reject(err);

            fs.copyFile(fromCharacterFile, toCharacterFile, (err) => {
                if (err) return reject(err);

                resolve();
            });
        });
    });
}

ipcMain.handle('copySettings', async (event, from, to) => {
    try {
        await copySettings(from, to);
        return { success: true };
    } catch (error) {
        console.error('Error copying settings:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('checkBrackets', async (event, server, profile) => {
    console.log('Checking brackets:', server, profile)
    const serverDir = server === 'Tranquility' ? tranquilityDir : thunderdomeDir;
    const prefsPath = path.join(serverDir, profile, 'prefs.ini');
    console.log('Checking brackets:', prefsPath)
    try {
        const lineExists = fs.readFileSync(prefsPath, 'utf-8').includes('bracketsAlwaysShowShipText=1');
        console.log('Line exists:', lineExists)
        return lineExists;
    } catch (error) {
        console.error('Failed to read prefs.ini:', error);
        throw new Error('Failed to read prefs.ini');
    }
});

ipcMain.handle('toggleBrackets', async (event, server, profile) => {
    const serverDir = server === 'Tranquility' ? tranquilityDir : thunderdomeDir;
    const prefsPath = path.join(serverDir, profile, 'prefs.ini');
    try {
        const prefsContent = await fs.readFileSync(prefsPath, 'utf8');
        if (prefsContent.includes('bracketsAlwaysShowShipText=1')) {
            console.log('Removing brackets line');
            const newPrefs = prefsContent.replace('\nbracketsAlwaysShowShipText=1', '');
            fs.writeFileSync(prefsPath, newPrefs, 'utf8');
            return false;
        } else {
            console.log('Adding brackets line');
            const newPrefs = prefsContent + '\nbracketsAlwaysShowShipText=1';
            fs.writeFileSync(prefsPath, newPrefs, 'utf8');
            return true;
        }
    } catch (error) {
        console.error('Failed to toggle brackets:', error);
        throw new Error('Failed to toggle brackets');
    }
});

// IPC handler to get account options
ipcMain.handle('getAccountOptions', async (event, { server, profile }) => {
    const serverDir = server === 'Tranquility' ? tranquilityDir : thunderdomeDir;
    const profileDir = path.join(serverDir, profile);

    try {
        const accountFiles = fs.readdirSync(profileDir).filter(file => file.startsWith('core_user_') && file.endsWith('.dat'));
        const accounts = accountFiles.map(file => file.replace('core_user_', '').replace('.dat', ''));
        console.log(`Accounts for ${server} and profile ${profile}:`, accounts);

        const accountOptions = await Promise.all(accounts.map(async account => {
            const lastModified = await getLastModified(server, profile, `core_user_${account}.dat`);
            return { value: account, label: `${account} - ${lastModified}` };
        }));
        console.log('Account options:', accountOptions)
        return accountOptions;
    } catch (error) {
        console.error('Error getting account options:', error);
        return [];
    }
});

// IPC handler to get character options
ipcMain.handle('getCharacterOptions', async (event, { server, profile }) => {
    const serverDir = server === 'Tranquility' ? tranquilityDir : thunderdomeDir;
    const profileDir = path.join(serverDir, profile);

    try {
        const characterFiles = fs.readdirSync(profileDir).filter(file => file.startsWith('core_char_') && file.endsWith('.dat'));
        const characters = characterFiles.map(file => file.replace('core_char_', '').replace('.dat', ''));
        console.log(`Characters for ${server}, profile ${profile}:`, characters);

        const characterOptions = await Promise.all(characters.map(async character => {
            const lastModified = await getLastModified(server, profile, `core_char_${character}.dat`);
            return { value: character, label: `${character} - ${lastModified}` };
        }));

        return characterOptions;
    } catch (error) {
        console.error('Error getting character options:', error);
        return [];
    }
});
