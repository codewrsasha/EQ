/* globals range, Notify */
'use strict';

const utils = {};
utils.filter = d => {
    if (d.url) {
        if (d.url.startsWith('http') || d.url.startsWith('ftp') || d.url === 'about:blank') {
            return true;
        }
    }
    return false;
};
utils.msg = {
    reload: 'Please reload tabs with active audio elements'
};

const elements = {
    mono: document.getElementById('mono'),
    pan: document.getElementById('pan'),
    volume: document.getElementById('volume'),
    levels: document.getElementById('levels'),
    presets: document.getElementById('presets'),
    profiles: document.getElementById('profiles'),
    add: document.getElementById('add'),
    remove: document.getElementById('remove'),
    enabled: document.getElementById('enabled'),
    persist: document.getElementById('persist')
};

const notify = new Notify();

const [pan, volume, ...ranges] = range.prepare();

const presets = {
    'Classical': [0.375, 0.375, 0.375, 0.375, 0.375, 0.375, -4.5, -4.5, -4.5, -6],
    'Default': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'Rock': [4.875, 3, -3.375, -4.875, -2.25, 2.625, 5.625, 6.75, 6.75, 6.75],
    'Pop': [-1.125, 3, 4.5, 4.875, 3.375, -0.75, -1.5, -1.5, -1.125, -1.125],
    'Full Bass': [6, 6, 6, 3.75, 1.125, -2.625, -5.25, -6.375, -6.75, -6.75],
    'Party': [4.5, 4.5, 0.375, 0.375, 0.375, 0.375, 0.375, 0.375, 4.5, 4.5],
    'Soft Rock': [2.625, 2.625, 1.5, -0.375, -2.625, -3.375, -2.25, -0.375, 1.875, 5.625],
    'Reggae': [0.375, 0.375, -0.375, -3.75, 0.375, 4.125, 4.125, 0.375, 0.375, 0.375],
    'Techno': [4.875, 3.75, 0.375, -3.375, -3, 0.375, 4.875, 6, 6, 5.625]
};

const prefs = {
    enabled: false,
    persist: false,
    profiles: ['Default'],
    profile: 'Default',
    pan: 0,
    mono: false
};

const save = {
    prefs: prefs => new Promise(resolve => chrome.storage.local.set(prefs, resolve)),
    mono: () => save.prefs({
        mono: elements.mono.checked
    }),
    pan: () => save.prefs({
        pan: 1 - (100 - pan.value) / 50
    }),
    volume: () => save.prefs({
        volume: (100 - volume.value) / 50,
        ['volume.' + elements.profiles.value]: (100 - volume.value) / 50
    }),
    levels: () => save.prefs({
        levels: presets[elements.presets.value],
        ['levels.' + elements.profiles.value]: presets[elements.presets.value]
    }),
    presets: () => save.prefs({
        ['presets.' + elements.profiles.value]: elements.presets.value
    }),
    profiles: () => save.prefs({
        profile: prefs.profile,
        profiles: prefs.profiles,
        volume: (100 - volume.value) / 50,
        levels: presets[elements.presets.value]
    }),
    enabled: () => save.prefs({
        enabled: elements.enabled.checked
    }),
    persist: () => save.prefs({
        persist: elements.persist.checked
    })
};

const update = {
    levels: () => presets[elements.presets.value]
        .map(v => (-v + 20) / 40 * 100)
        .forEach((value, i) => ranges[i].value = value),
    mono: value => elements.mono.checked = value,
    pan: level => pan.value = (level + 1) * 50,
    volume: level => volume.value = (2 - level) * 50,
    ui: (callback = () => {}) => chrome.storage.local.get({
        ['volume.' + elements.profiles.value]: 1,
        ['levels.' + elements.profiles.value]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ['presets.' + elements.profiles.value]: 'Default'
    }, prefs => {
        // presets
        elements.presets.value = prefs['presets.' + elements.profiles.value];
        //
        presets[elements.presets.value] = prefs['levels.' + elements.profiles.value];
        update.levels();
        update.volume(prefs['volume.' + elements.profiles.value]);
        callback();
    })
};

// presets
Object.keys(presets).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = key;
    elements.presets.appendChild(option);
});
elements.presets.addEventListener('change', async() => {
    update.levels();
    await save.presets();
    await save.levels();
});

// volume
elements.volume.addEventListener('change', save.volume);
// pan
elements.pan.addEventListener('change', save.pan);

// levels
{
    let id;
    const act = async() => {
        elements.presets.value = 'Custom';
        presets.Custom = ranges.map(r => -1 * r.value / 100 * 40 + 20);
        await save.presets();
        await save.levels();
    };
    elements.levels.addEventListener('change', () => {
        window.clearTimeout(id);
        id = window.setTimeout(act, 100);
    });
}

// remove
elements.remove.addEventListener('click', () => {
    prefs.profiles = prefs.profiles.filter(a => a !== elements.profiles.value);
    elements.profiles.selectedOptions[0].remove();
    elements.profiles.dispatchEvent(new Event('change'));
});

// enabled
elements.enabled.addEventListener('change', async() => {
    await save.enabled();
    if (elements.enabled.checked) {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, tabs => {
            if (tabs && tabs[0] && utils.filter(tabs[0])) {
                chrome.tabs.executeScript({
                    code: `typeof prefs`
                }, arr => {
                    if (!arr || arr[0] === 'undefined') {
                        notify.display(utils.msg.reload, 'warning', 2000);
                    }
                });
            }
        });
    }
});
elements.persist.addEventListener('change', save.persist);

// init
chrome.storage.local.get(prefs, ps => {
    Object.assign(prefs, ps);
    //
    elements.enabled.checked = prefs.enabled;
    elements.persist.checked = prefs.persist;
    // profiles
    prefs.profiles.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        elements.profiles.appendChild(option);
    });
    elements.profiles.value = prefs.profile;
    elements.remove.disabled = elements.profiles.value === 'Default';
    //
    update.ui();
    update.pan(prefs.pan);
    update.mono(prefs.mono);
});