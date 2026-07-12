// ==UserScript==
// @name         Panel Core - Универсальная панель управления
// @namespace    https://github.com/kollsan95/tampermonkey-plugins
// @version      1.0.21
// @description  Ядро панели управления с маршрутизацией ярлыков
// @author       kollsan95
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_notification
// @run-at       document-end
// @downloadURL  https://kollsan95.github.io/tampermonkey-plugins/panel-core.user.js
// ==/UserScript==

/**
 * ============================================================
 *  PANEL CORE - Универсальная панель управления
 * ============================================================
 **/

(function() {
    'use strict';

    console.log('🔷 Panel Core: Инициализация...');

    // ============================================================
    // 1. КОНФИГУРАЦИЯ
    // ============================================================
    const CONFIG = {
        VERSION_URL: 'https://kollsan95.github.io/tampermonkey-plugins/version.json',
        CHECK_INTERVAL: 3600000, // 1 час
        STORAGE_KEY: 'panel_plugins_cache',
        NOTIFICATIONS_KEY: 'panel_notifications_seen',
        NOTIFICATION_DURATION: 8000
    };

    // ============================================================
    // 2. СТИЛИ
    // ============================================================
    GM_addStyle(`
        /* ===== ПАНЕЛЬ ЗАДАЧ ===== */
        #panelTaskbar {
            position: fixed;
            right: 0;
            top: 0;
            width: 48px;
            height: 100vh;
            z-index: 9998;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 12px 0;
            background: rgba(30, 30, 40, 0.92);
            backdrop-filter: blur(10px);
            box-shadow: -2px 0 15px rgba(0,0,0,0.15);
            box-sizing: border-box;
            overflow-y: auto;
            transition: background 0.3s ease;
        }
        #panelTaskbar::-webkit-scrollbar {
            width: 2px;
        }
        #panelTaskbar::-webkit-scrollbar-track {
            background: transparent;
        }
        #panelTaskbar::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.15);
            border-radius: 2px;
        }

        #panelTaskbar .taskbar-divider {
            width: 28px;
            height: 1px;
            background: rgba(255,255,255,0.08);
            margin: 3px 0;
        }

        #panelTaskbar .taskbar-icon {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            border: none;
            cursor: pointer;
            font-size: 17px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.6);
            transition: all 0.2s ease;
            position: relative;
            flex-shrink: 0;
            margin-bottom: 2px;
        }
        #panelTaskbar .taskbar-icon:hover {
            background: rgba(255,255,255,0.14);
            color: #fff;
            transform: scale(1.04);
        }
        #panelTaskbar .taskbar-icon.active {
            background: #4CAF50;
            color: #fff;
            box-shadow: 0 2px 12px rgba(76, 175, 80, 0.35);
        }
        #panelTaskbar .taskbar-icon.active:hover {
            background: #43A047;
        }

        #panelTaskbar .taskbar-icon .badge {
            position: absolute;
            top: -2px;
            right: -2px;
            background: #f44336;
            color: #fff;
            font-size: 9px;
            font-weight: bold;
            min-width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 5px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            border: 2px solid rgba(30, 30, 40, 0.92);
            pointer-events: none;
            transition: transform 0.2s ease;
        }
        #panelTaskbar .taskbar-icon .badge.hidden {
            display: none;
        }
        #panelTaskbar .taskbar-icon .badge.pulse {
            animation: badgePulse 0.6s ease 2;
        }
        @keyframes badgePulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
        }

        #panelTaskbar .taskbar-icon .tooltip {
            position: absolute;
            right: 48px;
            background: rgba(0,0,0,0.85);
            color: #fff;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        #panelTaskbar .taskbar-icon .tooltip::after {
            content: '';
            position: absolute;
            right: -6px;
            top: 50%;
            transform: translateY(-50%);
            border: 6px solid transparent;
            border-left-color: rgba(0,0,0,0.85);
        }
        #panelTaskbar .taskbar-icon:hover .tooltip {
            opacity: 1;
        }

        #panelTaskbar .taskbar-icon .update-indicator {
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #4CAF50;
            border: 2px solid rgba(30, 30, 40, 0.92);
            display: none;
            animation: indicatorPulse 1.5s ease infinite;
        }
        #panelTaskbar .taskbar-icon .update-indicator.show {
            display: block;
        }
        @keyframes indicatorPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
        }

        /* ===== КОНТЕЙНЕР ОКОН ПЛАГИНОВ ===== */
        #panelWindows {
            position: fixed;
            top: 0;
            right: 48px;
            width: 22vw;
            min-width: 280px;
            max-width: 480px;
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
            transform: translateX(calc(100% + 48px));
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
            box-shadow: -4px 0 25px rgba(0,0,0,0.1);
        }
        #panelWindows .plugin-window.open {
            transform: translateX(0);
            pointer-events: all;
        }
        #panelWindows .plugin-window.hidden {
            display: none !important;
        }

        #panelWindows .plugin-window .window-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 12px;
            border-bottom: 2px solid #e8e8e8;
            margin-bottom: 12px;
        }
        #panelWindows .plugin-window .window-title {
            font-size: 16px;
            font-weight: 600;
            color: #222;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #panelWindows .plugin-window .window-close {
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #999;
            padding: 0 4px;
            transition: color 0.2s;
            line-height: 1;
        }
        #panelWindows .plugin-window .window-close:hover {
            color: #333;
        }

        #panelWindows .plugin-window .window-content {
            height: calc(100% - 60px);
            overflow-y: auto;
        }
        #panelWindows .plugin-window .window-content::-webkit-scrollbar {
            width: 5px;
        }
        #panelWindows .plugin-window .window-content::-webkit-scrollbar-track {
            background: #e8e8e8;
        }
        #panelWindows .plugin-window .window-content::-webkit-scrollbar-thumb {
            background: #ccc;
            border-radius: 4px;
        }
        #panelWindows .plugin-window .window-content::-webkit-scrollbar-thumb:hover {
            background: #aaa;
        }

        @keyframes pluginAdd {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
        #panelTaskbar .taskbar-icon.new-plugin {
            animation: pluginAdd 0.3s ease;
        }

        /* ===== УВЕДОМЛЕНИЯ ===== */
        #panelNotifications {
            position: fixed;
            bottom: 20px;
            right: 60px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 380px;
            pointer-events: none;
        }
        #panelNotifications .notification {
            background: rgba(30, 30, 40, 0.95);
            backdrop-filter: blur(10px);
            color: #fff;
            padding: 14px 18px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-size: 13px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            pointer-events: all;
            animation: notificationSlide 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            border-left: 4px solid #4CAF50;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            max-width: 380px;
        }
        #panelNotifications .notification .notif-icon {
            font-size: 20px;
            flex-shrink: 0;
            margin-top: 2px;
        }
        #panelNotifications .notification .notif-content {
            flex: 1;
            min-width: 0;
        }
        #panelNotifications .notification .notif-title {
            font-weight: 600;
            font-size: 14px;
            color: #fff;
        }
        #panelNotifications .notification .notif-text {
            color: rgba(255,255,255,0.8);
            font-size: 13px;
            margin-top: 2px;
            line-height: 1.4;
        }
        #panelNotifications .notification .notif-close {
            background: none;
            border: none;
            color: rgba(255,255,255,0.4);
            cursor: pointer;
            font-size: 16px;
            padding: 0 4px;
            flex-shrink: 0;
            transition: color 0.2s;
            line-height: 1;
        }
        #panelNotifications .notification .notif-close:hover {
            color: rgba(255,255,255,0.8);
        }
        #panelNotifications .notification.notif-update {
            border-left-color: #FF9800;
        }
        #panelNotifications .notification.notif-new {
            border-left-color: #4CAF50;
        }
        #panelNotifications .notification.notif-core {
            border-left-color: #2196F3;
        }
        #panelNotifications .notification.notif-error {
            border-left-color: #f44336;
        }

        @keyframes notificationSlide {
            0% { transform: translateX(100px); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
        }
        #panelNotifications .notification.removing {
            animation: notificationRemove 0.3s ease forwards;
        }
        @keyframes notificationRemove {
            0% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(100px); opacity: 0; }
        }
    `);

    // ============================================================
    // 3. МАРШРУТИЗАТОР
    // ============================================================

    const Router = {
        match: function(url, route) {
            if (!route || route === '*') return true;
            
            const pattern = route
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\\\*/g, '.*');
            
            const regex = new RegExp(`^${pattern}$`);
            return regex.test(url);
        },

        filterByUrl: function(plugins, url) {
            return plugins.filter(plugin => {
                if (!plugin.routes || plugin.routes.length === 0) {
                    return true;
                }
                return plugin.routes.some(route => this.match(url, route));
            });
        },

        getActivePlugins: function(allPlugins, url) {
            const active = {};
            Object.keys(allPlugins).forEach(id => {
                const plugin = allPlugins[id];
                const routes = plugin._routes || [];
                if (routes.length === 0 || routes.some(route => this.match(url, route))) {
                    active[id] = plugin;
                }
            });
            return active;
        }
    };

    // ============================================================
    // 4. API КОР
    // ============================================================
    const PanelCore = {
        _plugins: {},
        _pluginOrder: [],
        _openPluginId: null,
        _taskbar: null,
        _windows: null,
        _notificationsContainer: null,
        _versionCache: null,
        _checkTimer: null,
        _isInitialized: false,
        _currentUrl: window.location.pathname + window.location.hash,

        // ============================================================
        // Публичные методы
        // ============================================================

        registerPlugin: function(plugin) {
            if (!plugin.id || !plugin.name || !plugin.icon || typeof plugin.onOpen !== 'function') {
                console.error('❌ Panel Core: Некорректные данные плагина:', plugin);
                return false;
            }

            if (this._plugins[plugin.id]) {
                console.warn(`⚠️ Panel Core: Плагин "${plugin.id}" уже зарегистрирован`);
                return false;
            }

            const routes = plugin.routes || [];
            if (typeof routes === 'string') {
                plugin.routes = [routes];
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
                _version: plugin.version || '1.0.0',
                _downloadURL: plugin.downloadURL || null,
                _routes: plugin.routes || [],
                _isNew: false,
                _loaded: false,
                _originalOnOpen: null,
                _pluginConfig: null
            };

            this._pluginOrder.push(plugin.id);
            this._pluginOrder.sort((a, b) => {
                return (this._plugins[a].priority || 10) - (this._plugins[b].priority || 10);
            });

            this._updateVisibleIcons();

            console.log(`✅ Panel Core: Плагин "${plugin.name}" (${plugin.id}) зарегистрирован`);
            console.log(`   Маршруты: ${routes.length > 0 ? routes.join(', ') : 'все страницы'}`);
            return true;
        },

        showNotification: function(title, text, icon = '🔔', type = 'update', duration) {
            this._showNotification(title, text, icon, type, duration || CONFIG.NOTIFICATION_DURATION);
        },

        updateBadge: function(pluginId, count) {
            const plugin = this._plugins[pluginId];
            if (!plugin) {
                console.warn(`⚠️ Panel Core: Плагин "${pluginId}" не найден`);
                return;
            }
            plugin.badge = count || 0;
            this._updateIconBadge(pluginId);
        },

        openPlugin: function(pluginId) {
            const plugin = this._plugins[pluginId];
            if (!plugin) {
                console.warn(`⚠️ Panel Core: Плагин "${pluginId}" не найден`);
                return;
            }

            if (this._openPluginId === pluginId && plugin._windowElement && plugin._windowElement.classList.contains('open')) {
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
            requestAnimationFrame(() => {
                win.classList.add('open');
            });

            if (plugin._iconElement) {
                plugin._iconElement.classList.add('active');
            }

            const content = win.querySelector('.window-content');
            if (content) {
                try {
                    plugin.onOpen(content);
                } catch (e) {
                    console.error(`❌ Panel Core: Ошибка в onOpen плагина "${pluginId}":`, e);
                    content.innerHTML = `<div style="color:#d32f2f;padding:20px;">❌ Ошибка загрузки плагина</div>`;
                }
            }

            console.log(`📂 Panel Core: Открыт плагин "${plugin.name}"`);
        },

        closePlugin: function(pluginId) {
            const plugin = this._plugins[pluginId];
            if (!plugin || this._openPluginId !== pluginId) {
                return;
            }

            const win = plugin._windowElement;
            if (win) {
                win.classList.remove('open');
                setTimeout(() => {
                    if (this._openPluginId !== pluginId) return;
                    win.classList.add('hidden');
                }, 350);
            }

            if (plugin._iconElement) {
                plugin._iconElement.classList.remove('active');
            }

            if (typeof plugin.onClose === 'function') {
                try {
                    plugin.onClose();
                } catch (e) {
                    console.error(`❌ Panel Core: Ошибка в onClose плагина "${pluginId}":`, e);
                }
            }

            this._openPluginId = null;
            console.log(`📂 Panel Core: Закрыт плагин "${plugin.name}"`);
        },

        isOpen: function(pluginId) {
            return this._openPluginId === pluginId;
        },

        getPlugin: function(pluginId) {
            return this._plugins[pluginId] || null;
        },

        getAllPlugins: function() {
            return this._plugins;
        },

        getActivePlugins: function() {
            const url = window.location.pathname + window.location.hash;
            return Router.getActivePlugins(this._plugins, url);
        },

        // ============================================================
        // Загрузка плагинов из version.json
        // ============================================================

        loadPluginsFromVersion: function() {
            console.log('🔍 Panel Core: Проверка обновлений...');

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
                        const seenNotifications = JSON.parse(GM_getValue(CONFIG.NOTIFICATIONS_KEY, '{}'));

                        GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(data));

                        if (data.core) {
                            const currentVersion = GM_getValue('panel_core_version', '0.0.0');
                            if (currentVersion !== data.core.version) {
                                GM_setValue('panel_core_version', data.core.version);
                                const notifKey = `core_${data.core.version}`;
                                if (!seenNotifications[notifKey]) {
                                    PanelCore._showNotification(
                                        '🔄 Обновление ядра',
                                        `Panel Core обновлён до версии ${data.core.version}`,
                                        '⚙️',
                                        'core'
                                    );
                                    seenNotifications[notifKey] = true;
                                    GM_setValue(CONFIG.NOTIFICATIONS_KEY, JSON.stringify(seenNotifications));
                                }
                            }
                            console.log(`🔷 Panel Core: Версия ядра ${data.core.version}`);
                        }

                        if (data.plugins && Array.isArray(data.plugins)) {
                            let newPluginsCount = 0;
                            let updatedPluginsCount = 0;
                            
                            data.plugins.forEach(function(pluginConfig) {
                                if (!pluginConfig.enabled) {
                                    console.log(`⏭️ Panel Core: Плагин "${pluginConfig.name}" отключён`);
                                    return;
                                }

                                const existing = PanelCore._plugins[pluginConfig.id];
                                if (existing) {
                                    if (existing._version !== pluginConfig.version) {
                                        console.log(`🔄 Panel Core: Обновление плагина "${pluginConfig.name}" (${existing._version} → ${pluginConfig.version})`);
                                        PanelCore._reloadPlugin(pluginConfig);
                                        updatedPluginsCount++;
                                        
                                        const notifKey = `${pluginConfig.id}_${pluginConfig.version}`;
                                        if (!seenNotifications[notifKey]) {
                                            PanelCore._showNotification(
                                                `🔄 Обновлён: ${pluginConfig.name}`,
                                                `${pluginConfig.name} обновлён до версии ${pluginConfig.version}`,
                                                pluginConfig.icon || '📦',
                                                'update'
                                            );
                                            seenNotifications[notifKey] = true;
                                            GM_setValue(CONFIG.NOTIFICATIONS_KEY, JSON.stringify(seenNotifications));
                                        }
                                    }
                                    return;
                                }

                                console.log(`📥 Panel Core: Новый плагин "${pluginConfig.name}" (${pluginConfig.id})`);
                                PanelCore._loadPluginFromURL(pluginConfig);
                                newPluginsCount++;
                                
                                const notifKey = `${pluginConfig.id}_added`;
                                if (!seenNotifications[notifKey]) {
                                    PanelCore._showNotification(
                                        `✨ Новый плагин: ${pluginConfig.name}`,
                                        pluginConfig.description || 'Доступен новый плагин',
                                        pluginConfig.icon || '🚀',
                                        'new'
                                    );
                                    seenNotifications[notifKey] = true;
                                    GM_setValue(CONFIG.NOTIFICATIONS_KEY, JSON.stringify(seenNotifications));
                                }
                            });

                            if (newPluginsCount > 0 || updatedPluginsCount > 0) {
                                PanelCore._updateVisibleIcons();
                            }
                        }

                    } catch (e) {
                        console.error('❌ Panel Core: Ошибка парсинга version.json:', e);
                    }
                },
                onerror: function(error) {
                    console.error('❌ Panel Core: Ошибка загрузки version.json:', error);
                }
            });
        },

        _loadPluginFromURL: function(pluginConfig) {
            const downloadURL = pluginConfig.downloadURL;
            if (!downloadURL) {
                console.error(`❌ Panel Core: Нет downloadURL для плагина "${pluginConfig.name}"`);
                return;
            }

            const tempPlugin = {
                id: pluginConfig.id,
                name: pluginConfig.name,
                icon: pluginConfig.icon || '🔌',
                version: pluginConfig.version || '1.0.0',
                downloadURL: downloadURL,
                priority: pluginConfig.priority || 10,
                routes: pluginConfig.routes || [],
                onOpen: function(container) {
                    PanelCore._loadPluginCode(pluginConfig, container);
                },
                onClose: function() {},
                onBadgeUpdate: function() {}
            };

            this.registerPlugin(tempPlugin);
            
            const plugin = this._plugins[pluginConfig.id];
            if (plugin) {
                plugin._pluginConfig = pluginConfig;
                plugin._isNew = true;
            }
        },

        _loadPluginCode: function(pluginConfig, container) {
            const plugin = this._plugins[pluginConfig.id];
            if (!plugin) return;

            if (plugin._loaded) {
                if (plugin._originalOnOpen) {
                    plugin._originalOnOpen(container);
                }
                return;
            }

            container.innerHTML = `
                <div style="text-align:center;padding:20px;color:#999;">
                    Загрузка плагина "${pluginConfig.name}"...
                </div>
            `;

            GM_xmlhttpRequest({
                method: 'GET',
                url: pluginConfig.downloadURL,
                onload: function(response) {
                    if (response.status !== 200) {
                        container.innerHTML = `
                            <div style="color:#d32f2f;text-align:center;padding:20px;">
                                ❌ Ошибка загрузки плагина (${response.status})
                            </div>
                        `;
                        return;
                    }

                    try {
                        const script = document.createElement('script');
                        script.textContent = `
                            (function() {
                                console.log('✅ Плагин "${pluginConfig.name}" загружен');
                            })();
                        `;
                        document.head.appendChild(script);
                        document.head.removeChild(script);

                        plugin._loaded = true;
                        
                        if (typeof plugin.onOpen === 'function') {
                            plugin._originalOnOpen = plugin.onOpen;
                            plugin.onOpen = function(cont) {
                                if (plugin._originalOnOpen) {
                                    plugin._originalOnOpen(cont);
                                }
                            };
                            plugin._originalOnOpen(container);
                        }

                    } catch (e) {
                        container.innerHTML = `
                            <div style="color:#d32f2f;text-align:center;padding:20px;">
                                ❌ Ошибка выполнения плагина: ${e.message}
                            </div>
                        `;
                        console.error('❌ Panel Core: Ошибка выполнения плагина:', e);
                    }
                },
                onerror: function(error) {
                    container.innerHTML = `
                        <div style="color:#d32f2f;text-align:center;padding:20px;">
                            ❌ Ошибка загрузки плагина
                        </div>
                    `;
                    console.error('❌ Panel Core: Ошибка загрузки плагина:', error);
                }
            });
        },

        _reloadPlugin: function(pluginConfig) {
            const plugin = this._plugins[pluginConfig.id];
            if (!plugin) return;

            plugin._version = pluginConfig.version;
            plugin._routes = pluginConfig.routes || [];
            
            if (this.isOpen(pluginConfig.id)) {
                this.closePlugin(pluginConfig.id);
            }

            plugin._loaded = false;
            plugin._originalOnOpen = null;

            if (plugin._iconElement) {
                let indicator = plugin._iconElement.querySelector('.update-indicator');
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.className = 'update-indicator';
                    plugin._iconElement.appendChild(indicator);
                }
                indicator.classList.add('show');
                setTimeout(function() {
                    if (indicator) indicator.classList.remove('show');
                }, 5000);

                plugin._iconElement.style.animation = 'badgePulse 0.6s ease 2';
                setTimeout(function() {
                    if (plugin._iconElement) {
                        plugin._iconElement.style.animation = '';
                    }
                }, 1200);
            }

            this._updateVisibleIcons();

            console.log(`🔄 Panel Core: Плагин "${pluginConfig.name}" перезагружен (v${pluginConfig.version})`);
        },

        // ============================================================
        // Управление видимостью иконок
        // ============================================================

        _updateVisibleIcons: function() {
            const url = window.location.pathname + window.location.hash;
            const activePlugins = Router.getActivePlugins(this._plugins, url);
            const activeIds = Object.keys(activePlugins);

            console.log(`📍 Текущий URL: ${url}`);
            console.log(`🎯 Активных плагинов: ${activeIds.length}`);

            Object.keys(this._plugins).forEach(function(id) {
                const plugin = this._plugins[id];
                const isActive = activeIds.includes(id);

                if (isActive) {
                    if (!plugin._iconElement && this._taskbar) {
                        this._addIconToTaskbar(id);
                    } else if (plugin._iconElement) {
                        plugin._iconElement.style.display = '';
                    }
                } else {
                    if (plugin._iconElement) {
                        plugin._iconElement.style.display = 'none';
                    }
                    if (this.isOpen(id)) {
                        this.closePlugin(id);
                    }
                }
            }.bind(this));
        },

        // ============================================================
        // Внутренние методы
        // ============================================================

        _init: function() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    this._createUI();
                }.bind(this));
            } else {
                this._createUI();
            }

            this._startAutoUpdate();
            this._watchUrlChanges();
        },

        _createUI: function() {
            this._taskbar = document.createElement('div');
            this._taskbar.id = 'panelTaskbar';
            document.body.appendChild(this._taskbar);

            this._windows = document.createElement('div');
            this._windows.id = 'panelWindows';
            document.body.appendChild(this._windows);

            this._notificationsContainer = document.createElement('div');
            this._notificationsContainer.id = 'panelNotifications';
            document.body.appendChild(this._notificationsContainer);

            console.log('🔷 Panel Core: UI создан');

            this.loadPluginsFromVersion();

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

            this._isInitialized = true;
        },

        _watchUrlChanges: function() {
            let lastUrl = window.location.pathname + window.location.hash;
            
            setInterval(function() {
                const currentUrl = window.location.pathname + window.location.hash;
                if (currentUrl !== lastUrl) {
                    lastUrl = currentUrl;
                    console.log(`🔄 URL изменился: ${currentUrl}`);
                    this._updateVisibleIcons();
                }
            }.bind(this), 500);
        },

        _showNotification: function(title, text, icon = '🔔', type = 'update', duration) {
            if (!this._notificationsContainer) {
                this._notificationsContainer = document.createElement('div');
                this._notificationsContainer.id = 'panelNotifications';
                document.body.appendChild(this._notificationsContainer);
            }

            const notif = document.createElement('div');
            notif.className = `notification notif-${type}`;
            
            notif.innerHTML = `
                <span class="notif-icon">${icon || '🔔'}</span>
                <div class="notif-content">
                    <div class="notif-title">${title}</div>
                    <div class="notif-text">${text}</div>
                </div>
                <button class="notif-close">✕</button>
            `;

            notif.querySelector('.notif-close').addEventListener('click', function(e) {
                e.stopPropagation();
                notif.classList.add('removing');
                setTimeout(function() {
                    if (notif.parentNode) notif.remove();
                }, 300);
            });

            notif.addEventListener('click', function() {
                notif.classList.add('removing');
                setTimeout(function() {
                    if (notif.parentNode) notif.remove();
                }, 300);
            });

            this._notificationsContainer.appendChild(notif);

            setTimeout(function() {
                if (notif.parentNode) {
                    notif.classList.add('removing');
                    setTimeout(function() {
                        if (notif.parentNode) notif.remove();
                    }, 300);
                }
            }, duration || CONFIG.NOTIFICATION_DURATION);

            try {
                if (typeof GM_notification === 'function') {
                    GM_notification({
                        title: title,
                        text: text,
                        timeout: duration || CONFIG.NOTIFICATION_DURATION
                    });
                }
            } catch (e) {
                // Игнорируем ошибки
            }
        },

        _addIconToTaskbar: function(pluginId) {
            const plugin = this._plugins[pluginId];
            if (!plugin || !this._taskbar || plugin._iconElement) return;

            const icon = document.createElement('button');
            icon.className = 'taskbar-icon new-plugin';
            icon.dataset.pluginId = pluginId;
            icon.innerHTML = `
                ${plugin.icon}
                <span class="tooltip">${plugin.name}</span>
                <span class="badge hidden">0</span>
                <div class="update-indicator"></div>
            `;

            plugin._iconElement = icon;
            this._taskbar.appendChild(icon);
            this._updateIconBadge(pluginId);

            icon.addEventListener('click', function() {
                if (this.isOpen(pluginId)) {
                    this.closePlugin(pluginId);
                } else {
                    this.openPlugin(pluginId);
                }
            }.bind(this));
        },

        _createWindow: function(pluginId) {
            const plugin = this._plugins[pluginId];
            if (!plugin || !this._windows || plugin._windowElement) return;

            const win = document.createElement('div');
            win.className = 'plugin-window hidden';
            win.dataset.pluginId = pluginId;
            win.innerHTML = `
                <div class="window-header">
                    <div class="window-title">
                        ${plugin.icon} ${plugin.name}
                    </div>
                    <button class="window-close" data-plugin-id="${pluginId}">✕</button>
                </div>
                <div class="window-content"></div>
            `;

            win.querySelector('.window-close').addEventListener('click', function(e) {
                e.stopPropagation();
                this.closePlugin(pluginId);
            }.bind(this));

            this._windows.appendChild(win);
            plugin._windowElement = win;
        },

        _updateIconBadge: function(pluginId) {
            const plugin = this._plugins[pluginId];
            if (!plugin || !plugin._iconElement) return;

            const badge = plugin._iconElement.querySelector('.badge');
            if (!badge) return;

            const count = plugin.badge || 0;
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : String(count);
                badge.classList.remove('hidden');
                badge.classList.remove('pulse');
                void badge.offsetWidth;
                badge.classList.add('pulse');
            } else {
                badge.textContent = '0';
                badge.classList.add('hidden');
                badge.classList.remove('pulse');
            }

            if (typeof plugin.onBadgeUpdate === 'function') {
                try {
                    plugin.onBadgeUpdate(count);
                } catch (e) {
                    console.error(`❌ Panel Core: Ошибка в onBadgeUpdate плагина "${pluginId}":`, e);
                }
            }
        },

        _startAutoUpdate: function() {
            setTimeout(function() {
                this.loadPluginsFromVersion();
            }.bind(this), 5000);

            this._checkTimer = setInterval(function() {
                this.loadPluginsFromVersion();
            }.bind(this), CONFIG.CHECK_INTERVAL);

            console.log(`⏰ Panel Core: Автообновление включено (интервал ${CONFIG.CHECK_INTERVAL / 60000} мин)`);
        }
    };

    // ============================================================
    // 5. ЭКСПОРТ API
    // ============================================================
    window.PanelCore = PanelCore;

    // ============================================================
    // 6. ЗАПУСК
    // ============================================================
    PanelCore._init();

    console.log('🔷 Panel Core: Готов!');
    console.log('📖 Документация: https://github.com/kollsan95/tampermonkey-plugins');

})();