// ==UserScript==
// @name         Panel Core - Универсальная панель управления
// @namespace    https://github.com/kollsan95/tampermonkey-plugins
// @version      1.0.22
// @description  Ядро панели управления
// @author       kollsan95
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @run-at       document-end
// @downloadURL  https://kollsan95.github.io/tampermonkey-plugins/panel-core.user.js
// ==/UserScript==

(function() {
    'use strict';

    console.log('🔷 Panel Core: Инициализация...');

    // ============================================================
    // 1. СТИЛИ
    // ============================================================
    GM_addStyle(`
        #panelTaskbar {
            position: fixed;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 44px;
            z-index: 9998;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 4px;
            background: rgba(30, 30, 40, 0.85);
            backdrop-filter: blur(10px);
            border-radius: 10px 0 0 10px;
            box-shadow: -2px 0 15px rgba(0,0,0,0.15);
            box-sizing: border-box;
            transition: all 0.3s ease;
            gap: 4px;
        }
        #panelTaskbar.hidden { display: none !important; }
        #panelTaskbar .taskbar-icon {
            width: 34px;
            height: 34px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.7);
            transition: all 0.2s ease;
            position: relative;
        }
        #panelTaskbar .taskbar-icon:hover {
            background: rgba(255,255,255,0.18);
            color: #fff;
            transform: scale(1.05);
        }
        #panelTaskbar .taskbar-icon.active {
            background: #4CAF50;
            color: #fff;
            box-shadow: 0 2px 12px rgba(76, 175, 80, 0.35);
        }
        #panelTaskbar .taskbar-icon .badge {
            position: absolute;
            top: -2px;
            right: -2px;
            background: #f44336;
            color: #fff;
            font-size: 8px;
            font-weight: bold;
            min-width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            border: 2px solid rgba(30, 30, 40, 0.85);
        }
        #panelTaskbar .taskbar-icon .badge.hidden { display: none; }
        #panelTaskbar .taskbar-icon .tooltip {
            position: absolute;
            right: 44px;
            background: rgba(0,0,0,0.85);
            color: #fff;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
        }
        #panelTaskbar .taskbar-icon:hover .tooltip { opacity: 1; }
        #panelTaskbar .taskbar-icon .tooltip::after {
            content: '';
            position: absolute;
            right: -6px;
            top: 50%;
            transform: translateY(-50%);
            border: 5px solid transparent;
            border-left-color: rgba(0,0,0,0.85);
        }

        #panelWindows {
            position: fixed;
            top: 0;
            right: 44px;
            width: 20vw;
            min-width: 260px;
            max-width: 400px;
            height: 100vh;
            z-index: 9999;
            pointer-events: none;
            overflow: hidden;
        }
        #panelWindows .plugin-window {
            position: absolute;
            top: 0;
            right: 0;
            width: 100%;
            height: 100%;
            background: #f5f5f5;
            color: #333;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            box-sizing: border-box;
            padding: 16px 20px;
            overflow-y: auto;
            transform: translateX(calc(100% + 44px));
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
            box-shadow: -4px 0 25px rgba(0,0,0,0.1);
        }
        #panelWindows .plugin-window.open {
            transform: translateX(0);
            pointer-events: all;
        }
        #panelWindows .plugin-window.hidden { display: none !important; }
        #panelWindows .plugin-window .window-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 10px;
            border-bottom: 2px solid #e8e8e8;
            margin-bottom: 10px;
        }
        #panelWindows .plugin-window .window-title {
            font-size: 15px;
            font-weight: 600;
            color: #222;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #panelWindows .plugin-window .window-close {
            background: none;
            border: none;
            font-size: 17px;
            cursor: pointer;
            color: #999;
            padding: 0 4px;
            transition: color 0.2s;
        }
        #panelWindows .plugin-window .window-close:hover { color: #333; }
        #panelWindows .plugin-window .window-content {
            height: calc(100% - 55px);
            overflow-y: auto;
        }
        #panelWindows .plugin-window .window-content::-webkit-scrollbar {
            width: 4px;
        }
        #panelWindows .plugin-window .window-content::-webkit-scrollbar-track {
            background: #e8e8e8;
        }
        #panelWindows .plugin-window .window-content::-webkit-scrollbar-thumb {
            background: #ccc;
            border-radius: 4px;
        }

        #panelNotifications {
            position: fixed;
            bottom: 20px;
            right: 60px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-width: 340px;
            pointer-events: none;
        }
        #panelNotifications .notification {
            background: rgba(30, 30, 40, 0.95);
            backdrop-filter: blur(10px);
            color: #fff;
            padding: 12px 16px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            pointer-events: all;
            animation: slideIn 0.3s ease;
            border-left: 3px solid #4CAF50;
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }
        #panelNotifications .notification .notif-close {
            background: none;
            border: none;
            color: rgba(255,255,255,0.4);
            cursor: pointer;
            font-size: 14px;
            padding: 0 4px;
            flex-shrink: 0;
        }
        #panelNotifications .notification .notif-close:hover {
            color: rgba(255,255,255,0.8);
        }
        @keyframes slideIn {
            0% { transform: translateX(100px); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
        }
        #panelNotifications .notification.removing {
            animation: slideOut 0.3s ease forwards;
        }
        @keyframes slideOut {
            0% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(100px); opacity: 0; }
        }
    `);

    // ============================================================
    // 2. ЯДРО
    // ============================================================
    const PanelCore = {
        _plugins: {},
        _taskbar: null,
        _windows: null,
        _notifications: null,
        _openPluginId: null,
        _isReady: false,

        registerPlugin: function(plugin) {
            if (!plugin.id || !plugin.name || !plugin.icon || typeof plugin.onOpen !== 'function') {
                console.error('❌ Panel Core: Некорректные данные плагина');
                return false;
            }

            if (this._plugins[plugin.id]) {
                console.warn(`⚠️ Panel Core: Плагин "${plugin.id}" уже зарегистрирован`);
                return false;
            }

            this._plugins[plugin.id] = {
                id: plugin.id,
                name: plugin.name,
                icon: plugin.icon,
                badge: plugin.badge || 0,
                priority: plugin.priority || 10,
                onOpen: plugin.onOpen,
                onClose: plugin.onClose || null,
                onBadgeUpdate: plugin.onBadgeUpdate || null,
                _windowElement: null,
                _iconElement: null,
                _version: plugin.version || '1.0.0'
            };

            console.log(`✅ Panel Core: Плагин "${plugin.name}" (${plugin.id}) зарегистрирован`);
            this._updateTaskbar();
            return true;
        },

        updateBadge: function(pluginId, count) {
            const plugin = this._plugins[pluginId];
            if (!plugin) return;
            plugin.badge = count || 0;
            this._updateBadge(pluginId);
        },

        openPlugin: function(pluginId) {
            const plugin = this._plugins[pluginId];
            if (!plugin) return;

            if (this._openPluginId === pluginId) {
                this.closePlugin(pluginId);
                return;
            }

            if (this._openPluginId) {
                this.closePlugin(this._openPluginId);
            }

            this._openPluginId = pluginId;

            if (!plugin._windowElement) {
                this._createWindow(pluginId);
            }

            const win = plugin._windowElement;
            win.classList.remove('hidden');
            requestAnimationFrame(() => win.classList.add('open'));

            if (plugin._iconElement) {
                plugin._iconElement.classList.add('active');
            }

            const content = win.querySelector('.window-content');
            if (content) {
                try {
                    plugin.onOpen(content);
                } catch (e) {
                    content.innerHTML = `<div style="color:#d32f2f;padding:20px;">❌ Ошибка</div>`;
                }
            }
        },

        closePlugin: function(pluginId) {
            const plugin = this._plugins[pluginId];
            if (!plugin || this._openPluginId !== pluginId) return;

            const win = plugin._windowElement;
            if (win) {
                win.classList.remove('open');
                setTimeout(() => win.classList.add('hidden'), 350);
            }

            if (plugin._iconElement) {
                plugin._iconElement.classList.remove('active');
            }

            if (typeof plugin.onClose === 'function') {
                plugin.onClose();
            }

            this._openPluginId = null;
        },

        isOpen: function(pluginId) {
            return this._openPluginId === pluginId;
        },

        getPlugin: function(pluginId) {
            return this._plugins[pluginId] || null;
        },

        // ============================================================
        // ВНУТРЕННИЕ МЕТОДЫ
        // ============================================================

        _updateTaskbar: function() {
            if (!this._taskbar) return;

            this._taskbar.innerHTML = '';

            const sorted = Object.values(this._plugins).sort((a, b) => a.priority - b.priority);

            sorted.forEach(function(plugin) {
                const icon = document.createElement('button');
                icon.className = 'taskbar-icon';
                icon.dataset.pluginId = plugin.id;
                icon.innerHTML = `
                    ${plugin.icon}
                    <span class="tooltip">${plugin.name}</span>
                    <span class="badge hidden">0</span>
                `;

                plugin._iconElement = icon;
                this._taskbar.appendChild(icon);
                this._updateBadge(plugin.id);

                icon.addEventListener('click', function() {
                    this.openPlugin(plugin.id);
                }.bind(this));
            }.bind(this));

            if (sorted.length === 0) {
                this._taskbar.classList.add('hidden');
            } else {
                this._taskbar.classList.remove('hidden');
            }
        },

        _createWindow: function(pluginId) {
            const plugin = this._plugins[pluginId];
            if (!plugin || !this._windows) return;

            const win = document.createElement('div');
            win.className = 'plugin-window hidden';
            win.dataset.pluginId = pluginId;
            win.innerHTML = `
                <div class="window-header">
                    <div class="window-title">
                        ${plugin.icon} ${plugin.name}
                    </div>
                    <button class="window-close">✕</button>
                </div>
                <div class="window-content"></div>
            `;

            win.querySelector('.window-close').addEventListener('click', function() {
                this.closePlugin(pluginId);
            }.bind(this));

            this._windows.appendChild(win);
            plugin._windowElement = win;
        },

        _updateBadge: function(pluginId) {
            const plugin = this._plugins[pluginId];
            if (!plugin || !plugin._iconElement) return;

            const badge = plugin._iconElement.querySelector('.badge');
            if (!badge) return;

            const count = plugin.badge || 0;
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : String(count);
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }

            if (typeof plugin.onBadgeUpdate === 'function') {
                plugin.onBadgeUpdate(count);
            }
        },

        _showNotification: function(title, text, icon = '🔔') {
            if (!this._notifications) {
                this._notifications = document.createElement('div');
                this._notifications.id = 'panelNotifications';
                document.body.appendChild(this._notifications);
            }

            const notif = document.createElement('div');
            notif.className = 'notification';
            notif.innerHTML = `
                <span>${icon}</span>
                <div style="flex:1;">
                    <div style="font-weight:600;">${title}</div>
                    <div style="font-size:12px;opacity:0.8;">${text}</div>
                </div>
                <button class="notif-close">✕</button>
            `;

            notif.querySelector('.notif-close').addEventListener('click', function() {
                notif.classList.add('removing');
                setTimeout(function() { if (notif.parentNode) notif.remove(); }, 300);
            });

            this._notifications.appendChild(notif);

            setTimeout(function() {
                if (notif.parentNode) {
                    notif.classList.add('removing');
                    setTimeout(function() { if (notif.parentNode) notif.remove(); }, 300);
                }
            }, 6000);

            try {
                GM_notification({ title: title, text: text, timeout: 6000 });
            } catch (e) {}
        },

        _init: function() {
            this._taskbar = document.createElement('div');
            this._taskbar.id = 'panelTaskbar';
            document.body.appendChild(this._taskbar);

            this._windows = document.createElement('div');
            this._windows.id = 'panelWindows';
            document.body.appendChild(this._windows);

            this._isReady = true;
            console.log('🔷 Panel Core: Готов!');

            document.addEventListener('click', function(e) {
                if (this._openPluginId) {
                    const plugin = this._plugins[this._openPluginId];
                    const win = plugin?._windowElement;
                    const icon = plugin?._iconElement;
                    if (win && !win.contains(e.target) && icon && !icon.contains(e.target)) {
                        this.closePlugin(this._openPluginId);
                    }
                }
            }.bind(this));

            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && this._openPluginId) {
                    this.closePlugin(this._openPluginId);
                }
            }.bind(this));
        }
    };

    window.PanelCore = PanelCore;
    PanelCore._init();

})();