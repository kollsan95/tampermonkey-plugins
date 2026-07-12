// ==UserScript==
// @name         Мой новый плагин          ← Название плагина
// @namespace    https://github.com/yourusername/tampermonkey-plugins
// @version      1.0.0                    ← Версия (обновляй при изменениях)
// @description  Описание плагина          ← Что делает плагин
// @author       YourName                 ← Твоё имя
// @match        *://*/*
// @grant        GM_xmlhttpRequest        ← Права, если нужны запросы
// @grant        GM_getValue              ← Права, если нужно хранить данные
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Проверяем, что Panel Core загружен
    if (typeof PanelCore === 'undefined') {
        console.error('❌ My Plugin: Panel Core не найден!');
        return;
    }

    const PLUGIN_ID = 'my-new-plugin';  // ← Уникальный ID (латиница, без пробелов)

    // Если плагин уже зарегистрирован — выходим
    if (PanelCore.getPlugin(PLUGIN_ID)) {
        console.log('ℹ️ My Plugin: Уже зарегистрирован');
        return;
    }

    // ============================================================
    // ЛОГИКА ПЛАГИНА
    // ============================================================

    /**
     * Основная функция, которая вызывается при открытии окна
     * @param {HTMLElement} container - Контейнер для контента
     */
    function onPluginOpen(container) {
        container.innerHTML = `
            <div style="padding:10px;">
                <h3>👋 Мой новый плагин</h3>
                <p style="color:#666;">Здесь будет твой контент</p>
            </div>
        `;
    }

    // ============================================================
    // РЕГИСТРАЦИЯ ПЛАГИНА
    // ============================================================

    function registerPlugin() {
        if (typeof PanelCore === 'undefined' || !PanelCore.registerPlugin) {
            setTimeout(registerPlugin, 100);
            return;
        }

        const success = PanelCore.registerPlugin({
            id: PLUGIN_ID,
            name: 'Мой новый плагин',        // ← Название (будет в подсказке)
            icon: '🚀',                      // ← Иконка (эмодзи)
            badge: 0,                        // ← Начальное значение badge (0 = скрыт)
            priority: 10,                    // ← Порядок в панели (меньше = выше)
            version: '1.0.0',               // ← Версия плагина
            downloadURL: 'https://kollsan95.github.io/tampermonkey-plugins/plugins/my-new-plugin.js',
            onOpen: onPluginOpen,
            onClose: function() {
                // Что делать при закрытии (опционально)
                console.log('🔌 My Plugin: Закрыт');
            },
            onBadgeUpdate: function(count) {
                // Что делать при обновлении badge (опционально)
                console.log('🔌 My Plugin: Badge обновлён:', count);
            }
        });

        if (success) {
            console.log('✅ My Plugin: Зарегистрирован');
        } else {
            console.error('❌ My Plugin: Ошибка регистрации');
        }
    }

    registerPlugin();

})();