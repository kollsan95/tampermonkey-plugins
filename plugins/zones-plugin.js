// ==UserScript==
// @name         Zones Plugin - Анализ зон
// @namespace    https://github.com/kollsan95/tampermonkey-plugins
// @version      1.0.15
// @description  Анализ зон карты зала: поиск сломанных зон в секторе
// @author       kollsan95
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript//

(function() {
    'use strict';

    // ID плагина (используется для обновления badge)
    const PLUGIN_ID = 'zones-plugin';
    let cachedData = null;

    // ============================================================
    // 1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ============================================================

    function getSessionId() {
        const match = window.location.hash.match(/\/session\/(\d+)/);
        return match ? match[1] : null;
    }

    function getSectionId() {
        const match = window.location.hash.match(/\/section\/(\d+)/);
        return match ? match[1] : null;
    }

    function getApiBaseUrl() {
        return window.location.origin;
    }

    function getToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token' || name === 'access_token' || name === 'auth_token') {
                return value;
            }
        }
        try {
            return localStorage.getItem('token') || 
                   localStorage.getItem('access_token') || 
                   sessionStorage.getItem('token') ||
                   sessionStorage.getItem('access_token');
        } catch (e) {
            return null;
        }
    }

    function makeRequest(url, callback) {
        const token = getToken();
        if (!token) {
            callback({ status: 401 });
            return;
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            onload: function(response) {
                callback(response);
            },
            onerror: function(error) {
                callback({ status: 0, error: error });
            }
        });
    }

    // ============================================================
    // 2. ЗАГРУЗКА ДАННЫХ
    // ============================================================

    function loadData() {
        const sessionId = getSessionId();
        const sectionId = getSectionId();

        if (!sessionId || !sectionId) {
            console.log('⏳ Zones Plugin: Не подходящая страница');
            return;
        }

        console.log('🎫 Zones Plugin: Загрузка данных...');

        const mapUrl = `${getApiBaseUrl()}/api/v1/session/${sessionId}/map/section/${sectionId}/places/slim?ignoreSell=true`;
        const sessionUrl = `${getApiBaseUrl()}/api/v1/session/${sessionId}?expand=performance,zones`;

        let mapData = null, sessionData = null, done = 0;

        function checkDone() {
            done++;
            if (done === 2) {
                try {
                    cachedData = processData(mapData, sessionData);
                    console.log('✅ Zones Plugin: Данные загружены');
                    
                    // Обновляем badge, если есть сломанные зоны
                    if (cachedData && cachedData.brokenZones.length > 0) {
                        if (typeof PanelCore !== 'undefined') {
                            PanelCore.updateBadge(PLUGIN_ID, 1);
                        }
                    }
                } catch (e) {
                    console.error('❌ Zones Plugin: Ошибка:', e);
                }
            }
        }

        makeRequest(mapUrl, function(r) {
            if (r.status === 200) {
                try { mapData = JSON.parse(r.responseText); } catch(e) {}
            }
            checkDone();
        });

        makeRequest(sessionUrl, function(r) {
            if (r.status === 200) {
                try { sessionData = JSON.parse(r.responseText); } catch(e) {}
            }
            checkDone();
        });
    }

    // ============================================================
    // 3. ОБРАБОТКА ДАННЫХ
    // ============================================================

    function processData(mapData, sessionData) {
        if (!mapData || !mapData.data || !sessionData || !sessionData.zones) {
            return null;
        }

        const schema = mapData.schema;
        const data = mapData.data;
        const zonePrices = sessionData.zonePrices || {};

        const idx = {
            id: schema.indexOf('id'),
            zoneId: schema.indexOf('zoneId'),
            type: schema.indexOf('type'),
            color: schema.indexOf('color'),
            row: schema.indexOf('row'),
            place: schema.indexOf('place'),
            x: schema.indexOf('x'),
            y: schema.indexOf('y'),
            available: schema.indexOf('available')
        };

        const allPlaces = data.filter(item => item[idx.type] === '0');
        const brokenZones = allPlaces.filter(item => item[idx.zoneId] === 0 && !item[idx.available]);

        const validPlaces = allPlaces.filter(item => item[idx.zoneId] > 0);
        const zoneStats = {};
        validPlaces.forEach(item => {
            const z = item[idx.zoneId];
            if (z > 0) zoneStats[z] = (zoneStats[z] || 0) + 1;
        });

        const soldAll = allPlaces.filter(item => !item[idx.available]).length;
        const soldValid = validPlaces.filter(item => !item[idx.available]).length;
        const soldBroken = brokenZones.length;

        const byColor = {};
        brokenZones.forEach(item => {
            const c = item[idx.color] || '(без цвета)';
            if (!byColor[c]) byColor[c] = [];
            byColor[c].push(item);
        });
        const sortedGroups = Object.entries(byColor).sort((a, b) => b[1].length - a[1].length);

        return {
            allPlaces: allPlaces,
            brokenZones: brokenZones,
            validPlaces: validPlaces,
            zoneStats: zoneStats,
            zonePrices: zonePrices,
            soldAll: soldAll,
            soldValid: soldValid,
            soldBroken: soldBroken,
            sortedGroups: sortedGroups,
            idx: idx,
            sessionId: getSessionId(),
            sectionId: getSectionId()
        };
    }

    // ============================================================
    // 4. ОТОБРАЖЕНИЕ
    // ============================================================

    function renderData(container) {
        if (!container) return;

        if (!cachedData) {
            container.innerHTML = `
                <div style="padding:20px;text-align:center;color:#999;">
                    <div style="font-size:32px;margin-bottom:12px;">⏳</div>
                    <p>Данные ещё не загружены</p>
                </div>
            `;
            return;
        }

        const d = cachedData;
        const idx = d.idx;
        const sortedGroups = d.sortedGroups;
        const zonePrices = d.zonePrices;

        let html = `
            <div style="padding:4px 0;">
                <div style="margin-bottom:10px;padding:6px 10px;background:#e3f2fd;border-radius:6px;font-size:12px;color:#1565c0;display:flex;justify-content:space-between;">
                    <span>📍 Сектор ${d.sectionId}</span>
                    <span>Сессия ${d.sessionId}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
                    <div style="background:#fff;border-radius:6px;padding:8px;border:1px solid #e8e8e8;text-align:center;">
                        <div style="font-size:18px;font-weight:bold;color:#333;">${d.allPlaces.length}</div>
                        <div style="font-size:10px;color:#888;">Всего мест</div>
                    </div>
                    <div style="background:#fff;border-radius:6px;padding:8px;border:1px solid #e8e8e8;text-align:center;">
                        <div style="font-size:18px;font-weight:bold;color:#4CAF50;">${d.soldValid}</div>
                        <div style="font-size:10px;color:#888;">Корректных</div>
                    </div>
                    <div style="background:#fff;border-radius:6px;padding:8px;border:1px solid #e8e8e8;text-align:center;">
                        <div style="font-size:18px;font-weight:bold;color:#f44336;">${d.soldBroken}</div>
                        <div style="font-size:10px;color:#888;">Сломанных</div>
                    </div>
                    <div style="background:#fff;border-radius:6px;padding:8px;border:1px solid #e8e8e8;text-align:center;">
                        <div style="font-size:18px;font-weight:bold;color:#333;">${d.soldAll}</div>
                        <div style="font-size:10px;color:#888;">Всего продано</div>
                    </div>
                </div>
        `;

        if (Object.keys(d.zoneStats).length > 0) {
            html += `<details style="margin-bottom:8px;">
                <summary style="cursor:pointer;font-weight:600;font-size:12px;padding:4px 0;">📊 Зоны (${Object.keys(d.zoneStats).length})</summary>
                <div style="margin-top:4px;max-height:120px;overflow-y:auto;">`;
            Object.entries(d.zoneStats).sort((a, b) => b[1] - a[1]).forEach(([zoneId, count]) => {
                const info = (zonePrices[zoneId] || [])[0] || {};
                const color = info.c || '#ccc';
                const price = info.p !== undefined ? ` ${(info.p/100).toFixed(2)}₽` : '';
                html += `
                    <div style="display:flex;justify-content:space-between;padding:3px 6px;border-bottom:1px solid #f0f0f0;font-size:11px;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <div style="width:10px;height:10px;border-radius:2px;background:${color};border:1px solid #ddd;"></div>
                            <span>Зона ${zoneId}</span>
                            <span style="color:#888;font-size:10px;">${info.pTN || ''}</span>
                            <span style="color:#4CAF50;font-size:10px;">${price}</span>
                        </div>
                        <span style="background:#f0f0f0;padding:0 6px;border-radius:6px;font-weight:500;">${count}</span>
                    </div>
                `;
            });
            html += `</div></details>`;
        }

        if (sortedGroups.length > 0) {
            html += `
                <div style="border-top:2px solid #e8e8e8;padding-top:8px;">
                    <div style="font-weight:600;color:#d32f2f;font-size:12px;margin-bottom:6px;">🔍 Сломанные (${d.soldBroken})</div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
            `;
            sortedGroups.forEach(([color, items]) => {
                const isColor = color && color !== '(без цвета)';
                html += `
                    <div class="zone-group" style="background:#fff;border-radius:6px;border:1px solid #e8e8e8;overflow:hidden;cursor:pointer;">
                        <div class="zone-header" style="display:flex;justify-content:space-between;padding:8px 12px;background:#fafafa;border-bottom:1px solid #e8e8e8;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                ${isColor ? `<div style="width:14px;height:14px;border-radius:3px;background:${color};border:1px solid #ddd;"></div>` : ''}
                                <span style="font-weight:500;font-size:12px;">${color}</span>
                            </div>
                            <span style="background:#f44336;color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;">${items.length}</span>
                        </div>
                        <div class="zone-body" style="display:none;padding:6px 10px;max-height:200px;overflow-y:auto;">
                `;
                items.forEach(item => {
                    html += `
                        <div style="display:flex;justify-content:space-between;padding:3px 4px;border-bottom:1px solid #f5f5f5;font-size:11px;">
                            <span style="color:#888;">#${item[idx.id]}</span>
                            <span>Ряд ${item[idx.row]}, м.${item[idx.place]}</span>
                            <span style="color:#999;font-size:10px;">x:${item[idx.x]}, y:${item[idx.y]}</span>
                        </div>
                    `;
                });
                html += `</div></div>`;
            });
            html += `</div></div>`;
        } else {
            html += `
                <div style="text-align:center;padding:16px;color:#4CAF50;background:#e8f5e9;border-radius:6px;border:1px solid #c8e6c9;">
                    ✅ Все зрительские места имеют корректную zoneId
                </div>
            `;
        }

        html += `</div>`;
        container.innerHTML = html;

        container.querySelectorAll('.zone-group').forEach(group => {
            const header = group.querySelector('.zone-header');
            const body = group.querySelector('.zone-body');
            let open = false;
            header.addEventListener('click', function(e) {
                e.stopPropagation();
                open = !open;
                body.style.display = open ? 'block' : 'none';
                container.querySelectorAll('.zone-group').forEach(other => {
                    if (other !== group) {
                        other.querySelector('.zone-body').style.display = 'none';
                        other._open = false;
                    }
                });
                group._open = open;
            });
        });
    }

    // ============================================================
    // 5. ОПРЕДЕЛЯЕМ ПЛАГИН ДЛЯ CORE
    // ============================================================

    // Загружаем данные
    loadData();

    // Определяем плагин для Core
    window.__plugin_definition = {
        name: 'Анализ зон',
        icon: '🎫',
        priority: 10,
        onOpen: function(container) {
            renderData(container);
        },
        onClose: function() {
            console.log('🎫 Zones Plugin: Закрыт');
        }
    };

    console.log('✅ Zones Plugin: __plugin_definition определён');

})();