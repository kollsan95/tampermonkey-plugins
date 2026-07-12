// ==UserScript==
// @name         My New Plugin
// @version      1.0.0
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

    if (PanelCore.getPlugin && PanelCore.getPlugin(PLUGIN_ID)) {
        return;
    }

    PanelCore.registerPlugin({
        id: PLUGIN_ID,
        name: 'Мой новый плагин',
        icon: '🚀',
        badge: 0,
        priority: 20,
        onOpen: function(container) {
            container.innerHTML = `
                <div style="padding:20px;text-align:center;">
                    <div style="font-size:48px;margin-bottom:16px;">🚀</div>
                    <h3>Мой новый плагин</h3>
                    <p style="color:#999;">Заглушка</p>
                </div>
            `;
        }
    });

    console.log('✅ My Plugin: Зарегистрирован');

})();