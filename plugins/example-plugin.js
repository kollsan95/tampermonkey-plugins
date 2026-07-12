// ==UserScript==
// @name         Example Plugin - Шаблон для плагинов
// @namespace    https://github.com/yourusername/tampermonkey-plugins
// @version      1.0.0
// @description  Шаблон для создания новых плагинов панели управления
// @author       YourName
// @match        *://*/*
// @grant        GM_xmlhttpRequest  // Если нужны запросы
// @grant        GM_getValue        // Если нужно хранить данные
// @grant        GM_setValue
// @run-at       document-end
// @require      https://raw.githubusercontent.com/yourusername/tampermonkey-plugins/main/core/panel-core.js
// ==/UserScript==

/**
 * ============================================================
 *  EXAMPLE PLUGIN - Шаблон для создания плагинов
 * ============================================================
 * 
 * 📌 ОПИСАНИЕ:
 *   Этот файл является шаблоном для создания новых плагинов.
 *   Скопируй его, переименуй и адаптируй под свои нужды.
 * 
 * 📌 ИНСТРУКЦИЯ ПО СОЗДАНИЮ НОВОГО ПЛАГИНА:
 * 
 *   1. Скопируй этот файл в папку plugins/ с новым именем
 *   2. Измени метаданные (@name, @description, @author)
 *   3. Определи свой pluginId (уникальный)
 *   4. Реализуй логику в onOpen()
 *   5. При необходимости используй GM_* функции
 *   6. Зарегистрируй плагин через PanelCore.registerPlugin()
 * 
 * 📌 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ API:
 * 
 *   // Обновить badge
 *   PanelCore.updateBadge('my-plugin-id', 5);
 * 
 *   // Открыть плагин программно
 *   PanelCore.openPlugin('my-plugin-id');
 * 
 *   // Закрыть плагин
 *   PanelCore.closePlugin('my-plugin-id');
 * 
 *   // Проверить, открыт ли плагин
 *   const isOpen = PanelCore.isOpen('my-plugin-id');
 * 
 *   // Получить данные плагина
 *   const plugin = PanelCore.getPlugin('my-plugin-id');
 * 
 *   // Получить все плагины
 *   const all = PanelCore.getAllPlugins();
 * ============================================================
 */

(function() {
    'use strict';

    // Проверяем, что Panel Core загружен
    if (typeof PanelCore === 'undefined') {
        console.error('❌ Example Plugin: Panel Core не найден!');
        console.error('   Убедитесь, что core/panel-core.js подключен');
        return;
    }

    console.log('🔌 Example Plugin: Инициализация...');

    // ============================================================
    // 1. УНИКАЛЬНЫЙ ID ПЛАГИНА
    // ============================================================
    const PLUGIN_ID = 'example-plugin';  // ← ИЗМЕНИ НА СВОЙ!

    // ============================================================
    // 2. ЛОГИКА ПЛАГИНА
    // ============================================================

    /**
     * Основная функция, которая вызывается при открытии окна
     * @param {HTMLElement} container - Контейнер для контента
     */
    function onPluginOpen(container) {
        // Здесь твой код
        container.innerHTML = `
            <div style="padding:10px;">
                <h3>👋 Привет! Это пример плагина</h3>
                <p style="color:#666;font-size:13px;">
                    Тут может быть любой контент.
                </p>
                <p style="color:#666;font-size:13px;">
                    Можно использовать <strong>GM_xmlhttpRequest</strong> для запросов к API,
                    <strong>GM_getValue</strong>/<strong>GM_setValue</strong> для хранения данных.
                </p>
                <button onclick="
                    const count = Math.floor(Math.random() * 10) + 1;
                    PanelCore.updateBadge('${PLUGIN_ID}', count);
                    this.textContent = 'Badge: ' + count;
                " style="padding:6px 12px;background:#4CAF50;color:#fff;border:none;border-radius:4px;cursor:pointer;">
                    Обновить badge
                </button>
                <button onclick="PanelCore.updateBadge('${PLUGIN_ID}', 0)" style="padding:6px 12px;background:#f44336;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-left:8px;">
                    Сбросить badge
                </button>
            </div>
        `;
    }

    // ============================================================
    // 3. РЕГИСТРАЦИЯ ПЛАГИНА
    // ============================================================

    function registerPlugin() {
        // Ждём, пока Panel Core загрузится
        if (typeof PanelCore === 'undefined' || !PanelCore.registerPlugin) {
            setTimeout(registerPlugin, 100);
            return;
        }

        // Проверяем, не зарегистрирован ли уже
        if (PanelCore.getPlugin(PLUGIN_ID)) {
            console.log(`🔌 Example Plugin: Уже зарегистрирован (${PLUGIN_ID})`);
            return;
        }

        const success = PanelCore.registerPlugin({
            id: PLUGIN_ID,
            name: 'Пример плагина',     // ← ИЗМЕНИ НА СВОЁ НАЗВАНИЕ
            icon: '🔌',                // ← ИЗМЕНИ НА СВОЮ ИКОНКУ
            badge: 0,
            priority: 20,
            onOpen: onPluginOpen,
            onClose: function() {
                // Опционально: что делать при закрытии
                console.log(`🔌 Example Plugin: Закрыт`);
            },
            onBadgeUpdate: function(count) {
                // Опционально: что делать при обновлении badge
                console.log(`🔌 Example Plugin: Badge обновлён: ${count}`);
            }
        });

        if (success) {
            console.log(`✅ Example Plugin: Зарегистрирован (${PLUGIN_ID})`);
        } else {
            console.error(`❌ Example Plugin: Ошибка регистрации (${PLUGIN_ID})`);
        }
    }

    // ============================================================
    // 4. ЗАПУСК
    // ============================================================

    registerPlugin();

})();