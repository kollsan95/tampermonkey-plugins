// ==UserScript==
// @name         Panel Core - Универсальная панель управления
// @namespace    https://github.com/kollsan95/tampermonkey-plugins
// @version      1.0.0
// @description  Ядро панели управления. Загружает плагины из version.json с уведомлениями
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
 * 
 * 📌 ОПИСАНИЕ:
 *   Это ядро системы плагинов. Оно создаёт панель управления,
 *   загружает version.json и автоматически регистрирует плагины.
 * 
 * 📌 СИСТЕМА УВЕДОМЛЕНИЙ:
 *   - При добавлении нового плагина показывается уведомление
 *   - При обновлении плагина показывается уведомление
 *   - При изменении версии Core показывается уведомление
 *   - Уведомления показываются один раз (запоминаются в хранилище)
 * 
 * 📌 АВТООБНОВЛЕНИЕ ПЛАГИНОВ:
 *   - Каждый час проверяется version.json
 *   - Если появился новый плагин - он автоматически добавляется
 *   - Если обновилась версия плагина - он перезагружается
 * 
 * 📌 API ДЛЯ ПЛАГИНОВ:
 *   PanelCore.registerPlugin(plugin)  - регистрация плагина
 *   PanelCore.updateBadge(id, count)  - обновить badge
 *   PanelCore.openPlugin(id)          - открыть плагин
 *   PanelCore.closePlugin(id)         - закрыть плагин
 *   PanelCore.isOpen(id)              - проверить, открыт ли плагин
 *   PanelCore.getPlugin(id)           - получить данные плагина
 *   PanelCore.getAllPlugins()         - получить все плагины
 *   PanelCore.showNotification(msg)   - показать уведомление
 * ============================================================
 */

(function() {
    'use strict';

    console.log('🔷 Panel Core: Инициализация...');

    // ============================================================
    // 1. КОНФИГУРАЦИЯ
    // ============================================================
    const CONFIG = {
        VERSION_URL: 'https://kollsan95.github.io/tampermonkey-plugins/version.json',
        CHECK_INTERVAL: 3600000, // 1 час (в миллисекундах)
        STORAGE_KEY: 'panel_plugins_cache',
        NOTIFICATIONS_KEY: 'panel_notifications_seen',
        NOTIFICATION_DURATION: 8000 // 8 секунд
    };

    // ============================================================
    // 2. СТИЛИ
    // ============================================================
    // Добавляем стили для Pickr
    GM_addStyle(`
        @import url('https://cdn.jsdelivr.net/npm/@simonwep/pickr@1.8.2/dist/themes/classic.min.css');
    `);

    GM_addStyle(`
        /* ===== ПАНЕЛЬ (прижата к правому краю) ===== */
        #panelTaskbar {
            position: fixed !important;
            top: 10% !important;
            right: 0 !important;
            width: 64px !important;
            height: 80% !important;
            background: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(10px) !important;
            -webkit-backdrop-filter: blur(10px) !important;
            border-radius: 24px 0 0 24px !important;
            padding: 12px 8px !important;
            box-shadow: 
                -4px 0 32px rgba(0, 0, 0, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            border-right: none !important;
            z-index: 999999 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 6px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }

        #panelTaskbar::-webkit-scrollbar {
            width: 3px !important;
        }
        #panelTaskbar::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.15) !important;
            border-radius: 10px !important;
        }

        /* Иконки в панели */
        .taskbar-icon {
            width: 44px !important;
            height: 44px !important;
            min-width: 44px !important;
            min-height: 44px !important;
            border: none !important;
            border-radius: 50% !important;
            background: rgba(0, 0, 0, 0.04) !important;
            color: #1a1a1a !important;
            font-size: 18px !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: relative !important;
            padding: 0 !important;
            flex-shrink: 0 !important;
        }

        .taskbar-icon:hover {
            background: rgba(0, 0, 0, 0.08) !important;
            transform: scale(1.08) !important;
        }

        .taskbar-icon.active {
            background: rgba(0, 122, 255, 0.15) !important;
            color: #007aff !important;
        }

        /* Tooltip */
        .taskbar-icon .tooltip {
            position: absolute !important;
            right: calc(100% + 12px) !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            background: rgba(0, 0, 0, 0.85) !important;
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
            border-left-color: rgba(0, 0, 0, 0.85) !important;
        }

        /* Badge */
        .taskbar-icon .badge {
            position: absolute !important;
            top: -4px !important;
            right: -4px !important;
            background: #ff3b30 !important;
            color: white !important;
            font-size: 10px !important;
            font-weight: 600 !important;
            min-width: 18px !important;
            height: 18px !important;
            padding: 0 5px !important;
            border-radius: 10px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border: 2px solid rgba(255, 255, 255, 0.95) !important;
        }

        .taskbar-icon .badge.hidden {
            display: none !important;
        }

        /* ===== ОКНО ПЛАГИНА (справа, на всю высоту) ===== */
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
            right: 64px !important;
            width: 400px !important;
            height: 80% !important;
            background: white !important;
            border-radius: 24px 0 0 24px !important;
            box-shadow: -8px 0 40px rgba(0, 0, 0, 0.15) !important;
            pointer-events: auto !important;
            transform: translateX(420px) !important;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            border-right: none !important;
        }

        .plugin-window.open {
            transform: translateX(0) !important;
        }

        .plugin-window.hidden {
            display: none !important;
        }

        .plugin-window .window-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 16px 20px !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
            background: #f8f9fa !important;
            flex-shrink: 0 !important;
            min-height: 56px !important;
        }

        .plugin-window .window-title {
            font-weight: 600 !important;
            font-size: 16px !important;
            color: #1a1a1a !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
        }

        /* КРЕСТИК СКРЫТ */
        .plugin-window .window-close {
            display: none !important;
        }

        .plugin-window .window-content {
            padding: 20px !important;
            overflow-y: auto !important;
            flex: 1 !important;
            color: #1a1a1a !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
        }

        .plugin-window .window-content::-webkit-scrollbar {
            width: 6px !important;
        }
        .plugin-window .window-content::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.15) !important;
            border-radius: 10px !important;
        }

        /* ===== УВЕДОМЛЕНИЯ ===== */
        #panelNotifications {
            position: fixed !important;
            top: 20px !important;
            right: 84px !important;
            z-index: 9999999 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            max-width: 380px !important;
            pointer-events: none !important;
        }

        #panelNotifications .notification {
            background: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(10px) !important;
            border-radius: 12px !important;
            padding: 14px 16px !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
            display: flex !important;
            align-items: flex-start !important;
            gap: 12px !important;
            pointer-events: auto !important;
            cursor: pointer !important;
            animation: notifSlideIn 0.3s ease !important;
        }

        #panelNotifications .notification.removing {
            animation: notifSlideOut 0.3s ease forwards !important;
        }

        @keyframes notifSlideIn {
            from { opacity: 0; transform: translateX(40px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @keyframes notifSlideOut {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(40px); }
        }

        #panelNotifications .notif-icon { font-size: 24px !important; }
        #panelNotifications .notif-title { font-weight: 600 !important; font-size: 14px !important; }
        #panelNotifications .notif-text { font-size: 13px !important; color: #555 !important; }
        #panelNotifications .notif-close {
            background: none !important;
            border: none !important;
            color: #999 !important;
            cursor: pointer !important;
            font-size: 16px !important;
        }
    `);

    // ============================================================
    // 3. API КОР
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
                _isNew: false
            };

            this._pluginOrder.push(plugin.id);
            this._pluginOrder.sort((a, b) => {
                return (this._plugins[a].priority || 10) - (this._plugins[b].priority || 10);
            });

            if (this._taskbar) {
                this._addIconToTaskbar(plugin.id);
            }

            console.log(`✅ Panel Core: Плагин "${plugin.name}" (${plugin.id}) зарегистрирован`);
            return true;
        },

        /**
         * Показать уведомление
         * @param {string} title - Заголовок
         * @param {string} text - Текст уведомления
         * @param {string} icon - Эмодзи иконки
         * @param {string} type - Тип: 'update' | 'new' | 'core' | 'error'
         * @param {number} duration - Время показа в мс (по умолчанию 8000)
         */
        showNotification: function(title, text, icon = '🔔', type = 'update', duration = CONFIG.NOTIFICATION_DURATION) {
            this._showNotification(title, text, icon, type, duration);
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
                        const cached = GM_getValue(CONFIG.STORAGE_KEY, null);
                        const cachedData = cached ? JSON.parse(cached) : null;
                        const seenNotifications = JSON.parse(GM_getValue(CONFIG.NOTIFICATIONS_KEY, '{}'));

                        // Сохраняем кеш
                        GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(data));

                        // Проверяем core
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

                        // Регистрируем плагины
                        if (data.plugins && Array.isArray(data.plugins)) {
                            let newPluginsCount = 0;
                            let updatedPluginsCount = 0;
                            
                            data.plugins.forEach(pluginConfig => {
                                if (!pluginConfig.enabled) {
                                    console.log(`⏭️ Panel Core: Плагин "${pluginConfig.name}" отключён в конфиге`);
                                    return;
                                }

                                const existing = PanelCore._plugins[pluginConfig.id];
                                if (existing) {
                                    if (existing._version !== pluginConfig.version) {
                                        console.log(`🔄 Panel Core: Обновление плагина "${pluginConfig.name}" (${existing._version} → ${pluginConfig.version})`);
                                        PanelCore._reloadPlugin(pluginConfig);
                                        updatedPluginsCount++;
                                        
                                        // Уведомление об обновлении плагина
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

                                // Новый плагин
                                console.log(`📥 Panel Core: Новый плагин "${pluginConfig.name}" (${pluginConfig.id})`);
                                PanelCore._loadPluginFromURL(pluginConfig);
                                newPluginsCount++;
                                
                                // Уведомление о новом плагине
                                const notifKey = `${pluginConfig.id}_added`;
                                if (!seenNotifications[notifKey]) {
                                    PanelCore._showNotification(
                                        `✨ Новый плагин: ${pluginConfig.name}`,
                                        pluginConfig.description || 'Доступен новый плагин для панели управления',
                                        pluginConfig.icon || '🚀',
                                        'new'
                                    );
                                    seenNotifications[notifKey] = true;
                                    GM_setValue(CONFIG.NOTIFICATIONS_KEY, JSON.stringify(seenNotifications));
                                }
                            });

                            if (newPluginsCount > 0) {
                                console.log(`✅ Panel Core: Добавлено ${newPluginsCount} новых плагинов`);
                            }
                            if (updatedPluginsCount > 0) {
                                console.log(`✅ Panel Core: Обновлено ${updatedPluginsCount} плагинов`);
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
                onOpen: function(container) {
                    this._loadPluginCode(pluginConfig, container);
                }.bind(this),
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
            
            if (this.isOpen(pluginConfig.id)) {
                this.closePlugin(pluginConfig.id);
            }

            plugin._loaded = false;
            plugin._originalOnOpen = null;

            if (plugin._iconElement) {
                // Показываем индикатор обновления
                let indicator = plugin._iconElement.querySelector('.update-indicator');
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.className = 'update-indicator';
                    plugin._iconElement.appendChild(indicator);
                }
                indicator.classList.add('show');
                setTimeout(() => {
                    if (indicator) indicator.classList.remove('show');
                }, 5000);

                plugin._iconElement.style.animation = 'badgePulse 0.6s ease 2';
                setTimeout(() => {
                    if (plugin._iconElement) {
                        plugin._iconElement.style.animation = '';
                    }
                }, 1200);
            }

            console.log(`🔄 Panel Core: Плагин "${pluginConfig.name}" перезагружен (v${pluginConfig.version})`);
        },

        // ============================================================
        // Внутренние методы
        // ============================================================

        _init: function() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this._createUI());
            } else {
                this._createUI();
            }

            this._startAutoUpdate();
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

            document.addEventListener('click', (e) => {
                if (this._openPluginId) {
                    const plugin = this._plugins[this._openPluginId];
                    const win = plugin?._windowElement;
                    const icon = plugin?._iconElement;
                    if (win && !win.contains(e.target) && icon && !icon.contains(e.target)) {
                        this.closePlugin(this._openPluginId);
                    }
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this._openPluginId) {
                    this.closePlugin(this._openPluginId);
                }
            });

            this._isInitialized = true;
        },

        _showNotification: function(title, text, icon = '🔔', type = 'update', duration = CONFIG.NOTIFICATION_DURATION) {
            if (!this._notificationsContainer) {
                // Если контейнера нет — создаём
                this._notificationsContainer = document.createElement('div');
                this._notificationsContainer.id = 'panelNotifications';
                document.body.appendChild(this._notificationsContainer);
            }

            const notif = document.createElement('div');
            notif.className = `notification notif-${type}`;
            
            const typeMap = {
                'update': '🔄',
                'new': '✨',
                'core': '⚙️',
                'error': '❌'
            };
            const defaultIcon = typeMap[type] || '🔔';
            
            notif.innerHTML = `
                <span class="notif-icon">${icon || defaultIcon}</span>
                <div class="notif-content">
                    <div class="notif-title">${title}</div>
                    <div class="notif-text">${text}</div>
                </div>
                <button class="notif-close">✕</button>
            `;

            // Закрытие по кнопке
            notif.querySelector('.notif-close').addEventListener('click', function(e) {
                e.stopPropagation();
                notif.classList.add('removing');
                setTimeout(() => {
                    if (notif.parentNode) notif.remove();
                }, 300);
            });

            // Закрытие по клику на уведомление
            notif.addEventListener('click', function() {
                notif.classList.add('removing');
                setTimeout(() => {
                    if (notif.parentNode) notif.remove();
                }, 300);
            });

            this._notificationsContainer.appendChild(notif);

            // Автоматическое закрытие
            setTimeout(() => {
                if (notif.parentNode) {
                    notif.classList.add('removing');
                    setTimeout(() => {
                        if (notif.parentNode) notif.remove();
                    }, 300);
                }
            }, duration);

            // Также показываем системное уведомление (если разрешено)
            try {
                if (typeof GM_notification === 'function') {
                    GM_notification({
                        title: title,
                        text: text,
                        timeout: duration
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

            icon.addEventListener('click', () => {
                if (this.isOpen(pluginId)) {
                    this.closePlugin(pluginId);
                } else {
                    this.openPlugin(pluginId);
                }
            });
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

            win.querySelector('.window-close').addEventListener('click', (e) => {
                e.stopPropagation();
                this.closePlugin(pluginId);
            });

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
            setTimeout(() => {
                this.loadPluginsFromVersion();
            }, 5000);

            this._checkTimer = setInterval(() => {
                this.loadPluginsFromVersion();
            }, CONFIG.CHECK_INTERVAL);

            console.log(`⏰ Panel Core: Автообновление включено (интервал ${CONFIG.CHECK_INTERVAL / 60000} мин)`);
        }
    };

    // ============================================================
    // 4. ЭКСПОРТ API
    // ============================================================
    window.PanelCore = PanelCore;

    // ============================================================
    // 5. ЗАПУСК
    // ============================================================
    PanelCore._init();

    console.log('🔷 Panel Core: Готов!');
    console.log(`📖 Документация: https://github.com/kollsan95/tampermonkey-plugins`);

})();