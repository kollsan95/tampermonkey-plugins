// ==UserScript==
// @name         My New Plugin - Заглушка
// @namespace    https://github.com/kollsan95/tampermonkey-plugins
// @version      1.0.0
// @description  Пример плагина-заглушки
// @author       kollsan95
// @grant        none
// @run-at       document-end
// ==/UserScript//

(function() {
    'use strict';

    if (typeof PanelCore === 'undefined') {
        console.error('❌ My Plugin: Panel Core не найден');
        return;
    }

    const PLUGIN_ID = 'my-new-plugin';

    if (PanelCore.getPlugin(PLUGIN_ID)) {
        console.log('ℹ️ My Plugin: Уже зарегистрирован');
        return;
    }

    console.log('🔌 My Plugin: Регистрация заглушки...');

    PanelCore.registerPlugin({
        id: PLUGIN_ID,
        name: 'Мой новый плагин',
        icon: '🚀',
        badge: 0,
        priority: 20,
        version: '1.0.0',
        routes: [],
        onOpen: function(container) {
            container.innerHTML = `
                <div style="padding:20px;text-align:center;color:#666;">
                    <div style="font-size:48px;margin-bottom:16px;">🚀</div>
                    <h3>Мой новый плагин</h3>
                    <p style="color:#999;font-size:13px;">Заглушка. Здесь будет ваш контент.</p>
                    <p style="color:#ccc;font-size:11px;margin-top:12px;">Замените этот файл на свой код</p>
                </div>
            `;
        },
        onClose: function() {
            console.log('🔌 My Plugin: Закрыт');
        }
    });

    console.log('✅ My Plugin: Заглушка зарегистрирована');

})();