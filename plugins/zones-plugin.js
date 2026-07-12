// ==UserScript==
// @name         Zones Plugin - Карта зала
// @namespace    https://github.com/kollsan95/tampermonkey-plugins
// @version      1.0.0
// @description  Отображение зон на карте зала
// @author       kollsan95
// @match        *://*/*/session/*/map
// @match        *://*/*/session/*/map/*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Проверяем, что Core загружен
    if (typeof PanelCore === 'undefined') {
        console.error('❌ Zones Plugin: Panel Core не найден');
        return;
    }

    const PLUGIN_ID = 'zones-plugin';

    // Если плагин уже зарегистрирован — выходим
    if (PanelCore.getPlugin(PLUGIN_ID)) {
        console.log('ℹ️ Zones Plugin: Уже зарегистрирован');
        return;
    }

    console.log('🎫 Zones Plugin: Инициализация...');

    // ============================================================
    // ЛОГИКА ПЛАГИНА
    // ============================================================

    function getSessionId() {
        const hash = window.location.hash;
        const match = hash.match(/\/session\/(\d+)/);
        return match ? match[1] : null;
    }

    function loadZones(container) {
        const sessionId = getSessionId();
        if (!sessionId) {
            container.innerHTML = '<div style="color:#999;padding:20px;">❌ ID сессии не найден</div>';
            return;
        }

        const apiUrl = `${window.location.origin}/api/v1/session/${sessionId}?expand=performance,zones`;
        
        container.innerHTML = '<div style="color:#999;padding:20px;">Загрузка...</div>';

        GM_xmlhttpRequest({
            method: 'GET',
            url: apiUrl,
            onload: function(response) {
                if (response.status !== 200) {
                    container.innerHTML = `<div style="color:#d32f2f;padding:20px;">❌ Ошибка ${response.status}</div>`;
                    return;
                }

                try {
                    const data = JSON.parse(response.responseText);
                    displayZones(container, data);
                } catch (e) {
                    container.innerHTML = `<div style="color:#d32f2f;padding:20px;">❌ Ошибка: ${e.message}</div>`;
                }
            },
            onerror: function() {
                container.innerHTML = '<div style="color:#d32f2f;padding:20px;">❌ Ошибка загрузки</div>';
            }
        });
    }

    function displayZones(container, data) {
        if (!data.zones || data.zones.length === 0) {
            container.innerHTML = '<div style="color:#999;padding:20px;">Нет зон</div>';
            return;
        }

        const sorted = [...data.zones].sort((a, b) => a.id - b.id);
        const total = sorted.reduce((sum, z) => sum + (z.placesCount || 0), 0);

        let html = `
            <div style="font-size:12px;color:#666;padding:8px 12px;background:#fff;border-radius:6px;margin-bottom:10px;border:1px solid #ececec;">
                <span>🏷️ Зон: <strong>${sorted.length}</strong></span>
                <span style="margin-left:14px;">💺 Мест: <strong>${total}</strong></span>
            </div>
        `;

        sorted.forEach(zone => {
            const color = zone.color || '#ccc';
            const count = zone.placesCount || 0;
            const price = zone.prices?.[0]?.price;
            const priceRub = price ? ` ${(price/100).toFixed(2)}₽` : '';

            html += `
                <div style="padding:6px 10px;margin-bottom:3px;border-radius:6px;background:#fff;display:flex;justify-content:space-between;align-items:center;border:1px solid #ececec;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="width:14px;height:14px;border-radius:4px;background:${color};border:1px solid #ddd;"></div>
                        <div>
                            <strong style="font-size:12px;">Зона ${zone.id}</strong>
                            <span style="font-size:11px;color:#888;margin-left:6px;">${priceRub}</span>
                        </div>
                    </div>
                    <span style="font-size:12px;background:#f0f0f0;padding:0 8px;border-radius:10px;">${count}</span>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ============================================================
    // РЕГИСТРАЦИЯ
    // ============================================================

    PanelCore.registerPlugin({
        id: PLUGIN_ID,
        name: 'Зоны зала',
        icon: '🎫',
        badge: 0,
        priority: 10,
        version: '1.0.0',
        onOpen: function(container) {
            loadZones(container);
        },
        onClose: function() {
            console.log('🎫 Zones Plugin: Закрыт');
        }
    });

    console.log('✅ Zones Plugin: Зарегистрирован');

})();