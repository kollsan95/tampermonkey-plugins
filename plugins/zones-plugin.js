// ==UserScript==
// @name         Zones Plugin - Карта зала
// @namespace    https://github.com/kollsan95/tampermonkey-plugins
// @version      1.0.0
// @description  Плагин для панели управления: отображение зон на карте зала
// @author       kollsan95
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Проверяем, что Panel Core загружен
    if (typeof PanelCore === 'undefined') {
        console.error('❌ Zones Plugin: Panel Core не найден!');
        return;
    }

    console.log('🎫 Zones Plugin: Инициализация...');

    const PLUGIN_ID = 'zones-plugin';

    // Если плагин уже зарегистрирован — выходим
    if (PanelCore.getPlugin(PLUGIN_ID)) {
        console.log('🎫 Zones Plugin: Уже зарегистрирован');
        return;
    }

    // ============================================================
    // ЛОГИКА ПЛАГИНА
    // ============================================================

    function getSessionId() {
        const hash = window.location.hash;
        const match = hash.match(/\/session\/(\d+)/);
        return match ? match[1] : null;
    }

    function getApiBaseUrl() {
        return window.location.origin;
    }

    function loadZones(container) {
        const sessionId = getSessionId();
        if (!sessionId) {
            container.innerHTML = `
                <div style="color:#999;text-align:center;padding:20px;">
                    ❌ ID сессии не найден в URL
                </div>
            `;
            return;
        }

        const apiUrl = `${getApiBaseUrl()}/api/v1/session/${sessionId}?expand=performance,zones,distributorContracts,sessions,institution,distributorTickets`;
        
        container.innerHTML = `
            <div style="text-align:center;padding:20px;color:#999;">
                Загрузка зон...
            </div>
        `;

        GM_xmlhttpRequest({
            method: 'GET',
            url: apiUrl,
            onload: function(response) {
                if (response.status !== 200) {
                    container.innerHTML = `
                        <div style="color:#d32f2f;text-align:center;padding:20px;">
                            ❌ Ошибка: статус ${response.status}
                        </div>
                    `;
                    return;
                }

                try {
                    const data = JSON.parse(response.responseText);
                    displayZones(container, data);
                } catch (e) {
                    container.innerHTML = `
                        <div style="color:#d32f2f;text-align:center;padding:20px;">
                            ❌ Ошибка парсинга: ${e.message}
                        </div>
                    `;
                }
            },
            onerror: function() {
                container.innerHTML = `
                    <div style="color:#d32f2f;text-align:center;padding:20px;">
                        ❌ Ошибка загрузки данных
                    </div>
                `;
            }
        });
    }

    function displayZones(container, data) {
        if (!data.zones || data.zones.length === 0) {
            container.innerHTML = `
                <div style="color:#999;text-align:center;padding:20px;">
                    Нет зон для отображения
                </div>
            `;
            return;
        }

        const sortedZones = [...data.zones].sort((a, b) => a.id - b.id);
        const totalPlaces = sortedZones.reduce((sum, z) => sum + (z.placesCount || 0), 0);
        const emptyZones = sortedZones.filter(z => (z.placesCount || 0) === 0);

        let html = `
            <div style="font-size:11px;color:#666;padding:8px 12px;background:#fff;border-radius:6px;margin-bottom:10px;border:1px solid #ececec;">
                <span>🏷️ Всего зон: <strong style="color:#222;">${sortedZones.length}</strong></span>
                <span style="margin-left:14px;">💺 Мест: <strong style="color:#222;">${totalPlaces}</strong></span>
                <span style="margin-left:14px;">📦 Пустых: <strong style="color:#222;">${emptyZones.length}</strong></span>
            </div>
        `;

        sortedZones.forEach(zone => {
            const color = zone.color || '#ccc';
            const placesCount = zone.placesCount || 0;
            const price = zone.prices && zone.prices.length > 0 ? zone.prices[0].price : null;
            const priceType = zone.prices && zone.prices.length > 0 ? zone.prices[0].priceTypeId : null;
            
            let priceDisplay = '';
            if (price !== null) {
                const priceRub = (price / 100).toFixed(2);
                const typeLabel = priceType === 1 ? '🛷' : '🎫';
                priceDisplay = ` ${typeLabel} ${priceRub}₽`;
            }

            const isEmpty = placesCount === 0;
            const opacity = isEmpty ? '0.5' : '1';

            html += `
                <div style="padding:8px 10px;margin-bottom:4px;border-radius:6px;background:#fff;display:flex;justify-content:space-between;align-items:center;border:1px solid #ececec;opacity:${opacity};">
                    <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                        <div style="width:16px;height:16px;border-radius:4px;background:${color};border:1px solid #ddd;flex-shrink:0;"></div>
                        <div style="display:flex;flex-direction:column;min-width:0;">
                            <strong style="color:#222;font-size:12px;">Зона ${zone.id}</strong>
                            <span style="font-size:11px;color:#888;">${zone.name || 'Без названия'}${priceDisplay}</span>
                        </div>
                    </div>
                    <span style="font-size:12px;color:#555;background:#f0f0f0;padding:2px 9px;border-radius:12px;flex-shrink:0;font-weight:500;">${placesCount}</span>
                </div>
            `;
        });

        if (emptyZones.length > 0) {
            html += `
                <div style="margin-top:10px;padding:8px 12px;background:#fff3e0;border-radius:6px;border:1px solid #ffcc80;font-size:11px;color:#e65100;">
                    ⚠️ Пустые зоны: ${emptyZones.map(z => z.id).join(', ')}
                </div>
            `;
        }

        container.innerHTML = html;
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
            name: 'Зоны зала',
            icon: '🎫',
            badge: 0,
            priority: 10,
            version: '1.0.0',
            downloadURL: 'https://kollsan95.github.io/tampermonkey-plugins/plugins/zones-plugin.js',
            onOpen: function(container) {
                loadZones(container);
            },
            onClose: function() {
                // Опционально
            },
            onBadgeUpdate: function(count) {
                // Опционально
            }
        });

        if (success) {
            console.log('✅ Zones Plugin: Зарегистрирован');
            
            // Обновляем badge при изменении сессии
            let lastSessionId = getSessionId();
            setInterval(() => {
                const currentSessionId = getSessionId();
                if (currentSessionId !== lastSessionId) {
                    lastSessionId = currentSessionId;
                    // Обновляем данные, если плагин открыт
                    if (PanelCore.isOpen(PLUGIN_ID)) {
                        const plugin = PanelCore.getPlugin(PLUGIN_ID);
                        if (plugin && plugin._windowElement) {
                            const container = plugin._windowElement.querySelector('.window-content');
                            if (container) {
                                loadZones(container);
                            }
                        }
                    }
                }
            }, 1000);
        } else {
            console.error('❌ Zones Plugin: Ошибка регистрации');
        }
    }

    registerPlugin();

})();