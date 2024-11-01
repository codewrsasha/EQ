'use strict';

const prefs = {
    enabled: false,
    persist: false
};

chrome.storage.local.get(prefs, ps => {
    Object.assign(prefs, ps);

    if (prefs.persist === false && prefs.enabled) {
        const onStartup = () => {
            prefs.enabled = false;
            chrome.storage.local.set({
                enabled: false
            });
        };
        chrome.runtime.onStartup.addListener(onStartup);
        chrome.runtime.onInstalled.addListener(onStartup);
    }
});

chrome.runtime.onMessage.addListener((request, sender) => {
    const tabId = sender.tab.id;
    if (request.method === 'cannot-attach' || request.method === 'can-attach') {
        chrome.browserAction.setBadgeText({
            text: request.method === 'cannot-attach' ? 'D' : '',
            tabId
        });
        chrome.browserAction.setTitle({
            title: request.message,
            tabId
        });
    } else if (request.method === 'connected') {
        chrome.browserAction.setIcon({
            tabId,
            path: {
                '16': 'data/icons/active/16.png',
                '32': 'data/icons/active/32.png',
                '48': 'data/icons/active/48.png',
                '64': 'data/icons/active/64.png'
            }
        });
    } else if (request.method === 'disconnected') {
        chrome.browserAction.setIcon({
            tabId,
            path: {
                '16': 'data/icons/16.png',
                '32': 'data/icons/32.png',
                '48': 'data/icons/48.png',
                '64': 'data/icons/64.png'
            }
        });
    }
});

{
    const c = () => chrome.contextMenus.create({
        title: 'Open Test Page',
        id: 'open-test',
        contexts: ['browser_action']
    });
    chrome.runtime.onStartup.addListener(c);
    chrome.runtime.onInstalled.addListener(c);
}