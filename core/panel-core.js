// ==UserScript==
// @name         Panel Core
// @version      1.0.0
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        VERSION_URL: 'https://kollsan95.github.io/tampermonkey-plugins/version.json'
    };

    // ===== СТИЛИ =====
    GM_addStyle(`
        #panel-toggle-flag {
            position: fixed !important;
            bottom: 20% !important;
            right: 0 !important;
            height: 30px !important;
            min-height: 30px !important;
            width: 30px !important;
            border: none !important;
            border-radius: 8px 0 0 8px !important;
            background: rgba(255, 255, 255, 0.95) !important;
            color: #1a1a1a !important;
            font-size: 16px !important;
            cursor: pointer !important;
            z-index: 1000000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: -2px 0 12px rgba(0,0,0,0.08) !important;
            border: 1px solid rgba(255,255,255,0.3) !important;
            border-right: none !important;
            user-select: none !important;
            transition: all 0.3s !important;
        }
        #panel-toggle-flag:hover {
            background: rgba(255, 255, 255, 1) !important;
            transform: scale(1.05) !important;
        }
        #panel-toggle-flag.active {
            background: rgba(0, 122, 255, 0.12) !important;
            color: #007aff !important;
        }
        #panel-toggle-flag .flag-icon {
            font-size: 16px !important;
            line-height: 1 !important;
        }
        #panel-toggle-flag .flag-tooltip {
            position: absolute !important;
            right: calc(100% + 12px) !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            background: rgba(0,0,0,0.85) !important;
            color: white !important;
            padding: 4px 12px !important;
            border-radius: 6px !important;
            font-size: 12px !important;
            white-space: nowrap !important;
            pointer-events: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            transition: all 0.2s !important;
        }
        #panel-toggle-flag:hover .flag-tooltip {
            opacity: 1 !important;
            visibility: visible !important;
        }
        #panel-toggle-flag .flag-tooltip::after {
            content: '' !important;
            position: absolute !important;
            left: 100% !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            border: 5px solid transparent !important;
            border-left-color: rgba(0,0,0,0.85) !important;
        }

        #panelTaskbar {
            position: fixed !important;
            top: 10% !important;
            right: 0 !important;
            width: 44px !important;
            height: 67% !important;
            background: rgba(255,255,255,0.95) !important;
            backdrop-filter: blur(10px) !important;
            z-index: 999999 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 4px !important;
            padding: 8px 0 !important;
            overflow-y: auto !important;
            box-shadow: -2px 0 15px rgba(0,0,0,0.08) !important;
            border-radius: 12px 0 0 12px !important;
            transition: transform 0.3s !important;
        }
        #panelTaskbar.hidden {
            transform: translateX(100%) !important;
            pointer-events: none !important;
        }

        .taskbar-icon {
            border: none !important;
            border-radius: 50% !important;
            background: rgba(0,0,0,0.04) !important;
            color: #1a1a1a !important;
            font-size: 18px !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: relative !important;
            padding: 0 !important;
            width: 34px !important;
            height: 34px !important;
        }
        .taskbar-icon:hover {
            background: rgba(0,0,0,0.08) !important;
            transform: scale(1.08) !important;
        }
        .taskbar-icon.active {
            background: white !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
            border-radius: 0 20px 20px 0 !important;
        }
        .taskbar-icon .tooltip {
            position: absolute !important;
            right: calc(100% + 12px) !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            background: rgba(0,0,0,0.85) !important;
            color: white !important;
            padding: 4px 12px !important;
            border-radius: 6px !important;
            font-size: 12px !important;
            white-space: nowrap !important;
            pointer-events: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            transition: all 0.2s !important;
        }
        .taskbar-icon:hover .tooltip {
            opacity: 1 !important;
            visibility: visible !important;
        }
        .taskbar-icon .tooltip::after {
            content: '' !important;
            position: absolute !important;
            left: 100% !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            border: 5px solid transparent !important;
            border-left-color: rgba(0,0,0,0.85) !important;
        }
        .taskbar-icon .badge {
            position: absolute !important;
            top: -4px !important;
            right: -4px !important;
            background: #ff3b30 !important;
            color: white !important;
            font-size: 9px !important;
            font-weight: 600 !important;
            min-width: 16px !important;
            height: 16px !important;
            padding: 0 4px !important;
            border-radius: 10px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border: 2px solid rgba(255,255,255,0.95) !important;
        }
        .taskbar-icon .badge.hidden { display: none !important; }

        #panelWindows {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            pointer-events: none !important;
            z-index: 999998 !important;
        }
        .plugin-window {
            position: fixed !important;
            top: 10% !important;
            right: 44px !important;
            width: 30vw !important;
            min-width: 280px !important;
            max-width: 500px !important;
            height: 67% !important;
            background: white !important;
            border-radius: 20px 0 0 20px !important;
            box-shadow: -8px 0 40px rgba(0,0,0,0.12) !important;
            pointer-events: auto !important;
            transform: translateX(calc(100% + 20px)) !important;
            transition: transform 0.35s !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            opacity: 0 !important;
            visibility: hidden !important;
        }
        .plugin-window.open {
            transform: translateX(0) !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
        .plugin-window.hidden { display: none !important; }
        .plugin-window .window-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 16px 20px !important;
            border-bottom: 1px solid #e8e8e8 !important;
            background: white !important;
            flex-shrink: 0 !important;
        }
        .plugin-window .window-title {
            font-weight: 600 !important;
            font-size: 16px !important;
            color: #1a1a1a !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        .plugin-window .window-close {
            background: none !important;
            border: none !important;
            font-size: 18px !important;
            cursor: pointer !important;
            color: #999 !important;
            padding: 0 4px !important;
        }
        .plugin-window .window-close:hover { color: #333 !important; }
        .plugin-window .window-content {
            padding: 20px !important;
            overflow-y: auto !important;
            flex: 1 !important;
            background: white !important;
        }
        .plugin-window .window-content::-webkit-scrollbar { width: 6px !important; }
        .plugin-window .window-content::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.15) !important;
            border-radius: 10px !important;
        }
    `);

    // ===== ЯДРО =====
    const PanelCore = {
        _plugins: {},
        _taskbar: null,
        _windows: null,
        _toggleFlag: null,
        _openPluginId: null,
        _isPanelVisible: true,

        // ===== РЕГИСТРАЦИЯ ПЛАГИНА =====
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
                _windowElement: null,
                _iconElement: null
            };

            this._addIcon(plugin.id);
            console.log(`✅ Panel Core: Плагин "${plugin.name}" (${plugin.id}) зарегистрирован`);
            return true;
        },

        // ===== ОБНОВЛЕНИЕ BADGE =====
        updateBadge: function(pluginId, count) {
            const plugin = this._plugins[pluginId];
            if (!plugin) return;
            plugin.badge = count || 0;
            this._updateBadge(pluginId);
        },

        // ===== ОТКРЫТЬ ПЛАГИН =====
        openPlugin: function(pluginId) {
            const plugin = this._plugins[pluginId];
            if (!plugin) return;

            if (this._openPluginId === pluginId) {
                this.closePlugin(pluginId);
                return;
            }

            this.closeAllPlugins();
            this._openPluginId = pluginId;

            if (!plugin._windowElement) {
                this._createWindow(pluginId);
            }

            const win = plugin._windowElement;
            win.classList.remove('hidden');
            setTimeout(() => win.classList.add('open'), 10);

            if (plugin._iconElement) {
                plugin._iconElement.classList.add('active');
            }

            const content = win.querySelector('.window-content');
            try {
                plugin.onOpen(content);
            } catch (e) {
                content.innerHTML = `<div style="color:#d32f2f;padding:20px;">❌ Ошибка</div>`;
                console.error(e);
            }
        },

        // ===== ЗАКРЫТЬ ПЛАГИН =====
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
                try { plugin.onClose(); } catch(e) {}
            }

            this._openPluginId = null;
        },

        closeAllPlugins: function() {
            if (this._openPluginId) {
                this.closePlugin(this._openPluginId);
            }
        },

        // ===== ЗАГРУЗКА ПЛАГИНОВ ИЗ version.json =====
        loadPlugins: function() {
            if (!this._isPanelVisible) return;

            GM_xmlhttpRequest({
                method: 'GET',
                url: CONFIG.VERSION_URL,
                onload: function(response) {
                    if (response.status !== 200) {
                        console.warn(`⚠️ Panel Core: Не удалось загрузить version.json (${response.status})`);
                        return;
                    }

                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.plugins) {
                            data.plugins.forEach(function(pluginConfig) {
                                if (!pluginConfig.enabled) return;
                                if (this._plugins[pluginConfig.id]) return;

                                console.log(`📥 Panel Core: Загрузка "${pluginConfig.name}" (${pluginConfig.id})`);
                                this._loadPlugin(pluginConfig);
                            }.bind(this));
                        }
                    } catch (e) {
                        console.error('❌ Panel Core: Ошибка:', e);
                    }
                }.bind(this),
                onerror: function() {
                    console.error('❌ Panel Core: Ошибка загрузки version.json');
                }
            });
        },

        _loadPlugin: function(pluginConfig) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: pluginConfig.downloadURL,
                onload: function(response) {
                    if (response.status !== 200) {
                        console.error(`❌ Panel Core: Не удалось загрузить ${pluginConfig.name} (${response.status})`);
                        return;
                    }

                    try {
                        const script = document.createElement('script');
                        script.textContent = response.responseText;
                        document.head.appendChild(script);
                        document.head.removeChild(script);
                        console.log(`✅ Panel Core: Плагин "${pluginConfig.name}" загружен`);
                    } catch (e) {
                        console.error(`❌ Panel Core: Ошибка выполнения ${pluginConfig.name}:`, e);
                    }
                }.bind(this),
                onerror: function() {
                    console.error(`❌ Panel Core: Ошибка загрузки ${pluginConfig.name}`);
                }
            });
        },

        // ===== ВНУТРЕННИЕ МЕТОДЫ =====
        _addIcon: function(pluginId) {
            const plugin = this._plugins[pluginId];
            if (!plugin || !this._taskbar || plugin._iconElement) return;

            const icon = document.createElement('button');
            icon.className = 'taskbar-icon';
            icon.dataset.pluginId = pluginId;
            icon.innerHTML = `
                ${plugin.icon}
                <span class="tooltip">${plugin.name}</span>
                <span class="badge hidden">0</span>
            `;

            plugin._iconElement = icon;
            this._taskbar.appendChild(icon);
            this._updateBadge(pluginId);

            icon.addEventListener('click', function() {
                this.openPlugin(pluginId);
            }.bind(this));
        },

        _createWindow: function(pluginId) {
            const plugin = this._plugins[pluginId];
            if (!plugin || !this._windows) return;

            const win = document.createElement('div');
            win.className = 'plugin-window hidden';
            win.dataset.pluginId = pluginId;
            win.innerHTML = `
                <div class="window-header">
                    <div class="window-title">${plugin.icon} ${plugin.name}</div>
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
        },

        _togglePanel: function() {
            const taskbar = document.getElementById('panelTaskbar');
            const flag = document.getElementById('panel-toggle-flag');
            if (!taskbar || !flag) return;

            const isVisible = !taskbar.classList.contains('hidden');
            
            if (isVisible) {
                taskbar.classList.add('hidden');
                flag.classList.remove('active');
                flag.querySelector('.flag-icon').textContent = '▶';
                flag.querySelector('.flag-tooltip').textContent = 'Показать панель';
                this._isPanelVisible = false;
                this.closeAllPlugins();
            } else {
                taskbar.classList.remove('hidden');
                flag.classList.add('active');
                flag.querySelector('.flag-icon').textContent = '◀';
                flag.querySelector('.flag-tooltip').textContent = 'Скрыть панель';
                this._isPanelVisible = true;
                this.loadPlugins();
            }
        },

        _init: function() {
            // Флаг
            const flag = document.createElement('button');
            flag.id = 'panel-toggle-flag';
            flag.innerHTML = `
                <span class="flag-icon">◀</span>
                <span class="flag-tooltip">Скрыть панель</span>
            `;
            flag.addEventListener('click', function() { this._togglePanel(); }.bind(this));
            document.body.appendChild(flag);
            this._toggleFlag = flag;

            // Панель
            this._taskbar = document.createElement('div');
            this._taskbar.id = 'panelTaskbar';
            document.body.appendChild(this._taskbar);

            // Окна
            this._windows = document.createElement('div');
            this._windows.id = 'panelWindows';
            document.body.appendChild(this._windows);

            // Загружаем плагины
            this.loadPlugins();

            // Закрытие по клику вне
            document.addEventListener('click', function(e) {
                if (this._openPluginId) {
                    const plugin = this._plugins[this._openPluginId];
                    const win = plugin?._windowElement;
                    const icon = plugin?._iconElement;
                    const flagEl = document.getElementById('panel-toggle-flag');
                    if (win && !win.contains(e.target) && icon && !icon.contains(e.target) && flagEl && !flagEl.contains(e.target)) {
                        this.closePlugin(this._openPluginId);
                    }
                }
            }.bind(this));

            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && this._openPluginId) {
                    this.closePlugin(this._openPluginId);
                }
            }.bind(this));

            console.log('🔷 Panel Core: Готов!');
        }
    };

    window.PanelCore = PanelCore;
    PanelCore._init();

})();