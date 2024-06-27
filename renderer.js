window.addEventListener('DOMContentLoaded', async () => {
    const logMessage = document.getElementById('logMessage');
    logMessage.textContent = 'Loading server options...';

    const fromServerSelect = document.getElementById('fromServer');
    const toServerSelect = document.getElementById('toServer');
    const fromProfileSelect = document.getElementById('fromProfile');
    const toProfileSelect = document.getElementById('toProfile');
    const fromAccountSelect = document.getElementById('fromAccount');
    const toAccountSelect = document.getElementById('toAccount');
    const fromCharacterSelect = document.getElementById('fromCharacter');
    const toCharacterSelect = document.getElementById('toCharacter');
    const copyButton = document.getElementById('copyButton');

    function updateCopyButtonState() {
        if (fromServerSelect.value && fromProfileSelect.value && fromAccountSelect.value && fromCharacterSelect.value &&
            toServerSelect.value && toProfileSelect.value && toAccountSelect.value && toCharacterSelect.value) {
            copyButton.disabled = false;
        } else {
            copyButton.disabled = true;
        }
    }

    fromServerSelect.addEventListener('change', updateCopyButtonState);
    fromProfileSelect.addEventListener('change', updateCopyButtonState);
    fromAccountSelect.addEventListener('change', updateCopyButtonState);
    fromCharacterSelect.addEventListener('change', updateCopyButtonState);
    toServerSelect.addEventListener('change', updateCopyButtonState);
    toProfileSelect.addEventListener('change', updateCopyButtonState);
    toAccountSelect.addEventListener('change', updateCopyButtonState);
    toCharacterSelect.addEventListener('change', updateCopyButtonState);

    copyButton.addEventListener('click', async () => {
        const from = {
            server: fromServerSelect.value,
            profile: fromProfileSelect.value,
            account: fromAccountSelect.value,
            character: fromCharacterSelect.value
        };
        const to = {
            server: toServerSelect.value,
            profile: toProfileSelect.value,
            account: toAccountSelect.value,
            character: toCharacterSelect.value
        };

        try {
            await window.api.copySettings(from, to);
            logMessage.textContent = 'Settings copied successfully.';
        } catch (error) {
            logMessage.textContent = 'Failed to copy settings.';
            console.error('Failed to copy settings:', error);
        }
    });

    try {
        console.log('Requesting server options...');
        const servers = await window.api.getServerOptions();
        console.log('Servers received:', servers);

        if (servers.length > 0) {
            logMessage.textContent = 'Servers loaded successfully.';
        } else {
            logMessage.textContent = 'No servers found.';
        }

        function populateServerSelect(selectElement) {
            selectElement.innerHTML = '<option value="">Select Server</option>';
            servers.forEach(server => {
                const option = document.createElement('option');
                option.value = server;
                option.textContent = server;
                selectElement.appendChild(option);
            });
        }

        function handleServerSelection(selectElement, profileSelectElement, accountSelectElement, characterSelectElement) {
            selectElement.addEventListener('change', async (event) => {
                const server = event.target.value;
                if (server) {
                    profileSelectElement.disabled = false;
                    const profiles = await window.api.getProfileOptions(server);
                    console.log('Profiles received:', profiles);
                    populateProfileSelect(profileSelectElement, profiles);
                } else {
                    profileSelectElement.disabled = true;
                    profileSelectElement.innerHTML = '<option value="">Select Profile</option>';
                    accountSelectElement.disabled = true;
                    accountSelectElement.innerHTML = '<option value="">Select Account</option>';
                    characterSelectElement.disabled = true;
                    characterSelectElement.innerHTML = '<option value="">Select Character</option>';
                }
            });
        }

        function handleProfileSelection(profileSelectElement, accountSelectElement, serverSelectElement, characterSelectElement) {
            profileSelectElement.addEventListener('change', async (event) => {
                const profile = event.target.value;
                const server = serverSelectElement.value;
                console.log('Profile selected:', server, '-', profile, 'Requesting account options...')
                if (profile && server) {
                    accountSelectElement.disabled = false;
                    const accounts = await window.api.getAccountOptions(server, profile);
                    populateAccountSelect(accountSelectElement, accounts);
                } else {
                    accountSelectElement.disabled = true;
                    accountSelectElement.innerHTML = '<option value="">Select Account</option>';
                    characterSelectElement.disabled = true;
                    characterSelectElement.innerHTML = '<option value="">Select Character</option>';
                }
            });
        }

        function handleAccountSelection(accountSelectElement, serverSelectElement, profileSelectElement, characterSelectElement) {
            accountSelectElement.addEventListener('change', async (event) => {
                const account = event.target.value;
                const server = serverSelectElement.value;
                const profile = profileSelectElement.value;
                if (account && server && profile) {
                    characterSelectElement.disabled = false;
                    const characters = await window.api.getCharacterOptions(server, profile, account);
                    console.log('Characters received:', characters);
                    populateCharacterSelect(characterSelectElement, characters);
                } else {
                    characterSelectElement.disabled = true;
                    characterSelectElement.innerHTML = '<option value="">Select Character</option>';
                }
            });
        }

        function populateProfileSelect(selectElement, profiles) {
            selectElement.innerHTML = '<option value="">Select Profile</option>';
            profiles.forEach(profile => {
                if (profile.startsWith('settings_')) {
                    const option = document.createElement('option');
                    option.value = profile;
                    option.textContent = profile;
                    selectElement.appendChild(option);
                }
            });
        }

        function populateAccountSelect(selectElement, accounts) {
            console.log('Populating account select:', accounts);
            selectElement.innerHTML = '<option value="">Select Account</option>';
            accounts.forEach(account => {
                if (/^\d+$/.test(account.value)) {
                    const option = document.createElement('option');
                    option.value = account.value;
                    option.textContent = account.label;
                    selectElement.appendChild(option);
                } else {
                    console.error('Invalid account:', account);
                }
            });
        }

        function populateCharacterSelect(selectElement, characters) {
            selectElement.innerHTML = '<option value="">Select Character</option>';
            characters.forEach(character => {
                if (/^\d+$/.test(character.value)) {
                    const option = document.createElement('option');
                    option.value = character.value;
                    option.textContent = character.label;
                    selectElement.appendChild(option);
                }
            });
        }


        populateServerSelect(fromServerSelect);
        populateServerSelect(toServerSelect);
        
        handleServerSelection(fromServerSelect, fromProfileSelect, fromAccountSelect, fromCharacterSelect);
        handleServerSelection(toServerSelect, toProfileSelect, toAccountSelect, toCharacterSelect);

        handleProfileSelection(fromProfileSelect, fromAccountSelect, fromServerSelect, fromCharacterSelect);
        handleProfileSelection(toProfileSelect, toAccountSelect, toServerSelect, toCharacterSelect);

        handleAccountSelection(fromAccountSelect, fromServerSelect, fromProfileSelect, fromCharacterSelect);
        handleAccountSelection(toAccountSelect, toServerSelect, toProfileSelect, toCharacterSelect);

    } catch (error) {
        logMessage.textContent = 'Failed to load server options.';
        console.error('Failed to load server options:', error);
    }
});
