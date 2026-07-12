// ==UserScript==
// @name         My New Plugin - Анализ зон
// @namespace    https://github.com/kollsan95/tampermonkey-plugins
// @version      1.0.1
// @description  Анализ зон карты зала
// @author       kollsan95
// @match        *://*/*#/session/*/map/section/*
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const PLUGIN_ID = 'my-new-plugin';

    // Если Core ещё не загружен — ждём его через MutationObserver
    function waitForCore(callback) {
        if (typeof PanelCore !== 'undefined' && PanelCore._isReady) {
            callback();
            return;
        }

        // Слушаем появление PanelCore
        const observer = new MutationObserver(function() {
            if (typeof PanelCore !== 'undefined' && PanelCore._isReady) {
                observer.disconnect();
                callback();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        // Таймаут на всякий случай
        setTimeout(function() {
            observer.disconnect();
            if (typeof PanelCore !== 'undefined' && PanelCore._isReady) {
                callback();
            } else {
                console.error('❌ My Plugin: Core не найден');
            }
        }, 3000);
    }

    // Проверяем URL
    if (!window.location.hash.match(/\/session\/\d+\/map\/section\/\d+/)) {
        return;
    }

    waitForCore(function() {
        if (PanelCore.getPlugin(PLUGIN_ID)) {
            console.log('ℹ️ My Plugin: Уже зарегистрирован');
            return;
        }

        console.log('🚀 My Plugin: Регистрация...');

        let wasOpenedAfterBrokenFound = false;

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
            // Из кук
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'token' || name === 'access_token' || name === 'auth_token') {
                    return value;
                }
            }
            // Из storage
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

        function loadData(container) {
            const sessionId = getSessionId();
            const sectionId = getSectionId();

            if (!sessionId || !sectionId) {
                container.innerHTML = `<div style="color:#999;padding:30px;">❌ Данные не найдены</div>`;
                return;
            }

            container.innerHTML = `<div style="text-align:center;padding:30px;color:#999;">⏳ Загрузка...</div>`;

            const mapUrl = `${getApiBaseUrl()}/api/v1/session/${sessionId}/map/section/${sectionId}/places/slim?ignoreSell=true`;
            const sessionUrl = `${getApiBaseUrl()}/api/v1/session/${sessionId}?expand=performance,zones`;

            let mapData = null, sessionData = null, done = 0;

            function checkDone() {
                done++;
                if (done === 2) {
                    try {
                        renderData(container, mapData, sessionData);
                    } catch (e) {
                        container.innerHTML = `<div style="color:#d32f2f;padding:20px;">❌ Ошибка: ${e.message}</div>`;
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

        function renderData(container, mapData, sessionData) {
            if (!mapData || !mapData.data || !sessionData || !sessionData.zones) {
                container.innerHTML = `<div style="color:#d32f2f;padding:20px;">❌ Нет данных</div>`;
                return;
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

            // Уведомление
            if (brokenZones.length > 0 && !wasOpenedAfterBrokenFound) {
                PanelCore.updateBadge(PLUGIN_ID, 1);
            } else if (brokenZones.length === 0) {
                PanelCore.updateBadge(PLUGIN_ID, 0);
            }

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

            let html = `
                <div style="padding:4px 0;">
                    <div style="margin-bottom:10px;padding:6px 10px;background:#e3f2fd;border-radius:6px;font-size:12px;color:#1565c0;display:flex;justify-content:space-between;">
                        <span>📍 Сектор ${getSectionId()}</span>
                        <span>Сессия ${getSessionId()}</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
                        <div style="background:#fff;border-radius:6px;padding:8px;border:1px solid #e8e8e8;text-align:center;">
                            <div style="font-size:18px;font-weight:bold;color:#333;">${allPlaces.length}</div>
                            <div style="font-size:10px;color:#888;">Всего мест</div>
                        </div>
                        <div style="background:#fff;border-radius:6px;padding:8px;border:1px solid #e8e8e8;text-align:center;">
                            <div style="font-size:18px;font-weight:bold;color:#4CAF50;">${soldValid}</div>
                            <div style="font-size:10px;color:#888;">Корректных</div>
                        </div>
                        <div style="background:#fff;border-radius:6px;padding:8px;border:1px solid #e8e8e8;text-align:center;">
                            <div style="font-size:18px;font-weight:bold;color:#f44336;">${soldBroken}</div>
                            <div style="font-size:10px;color:#888;">Сломанных</div>
                        </div>
                        <div style="background:#fff;border-radius:6px;padding:8px;border:1px solid #e8e8e8;text-align:center;">
                            <div style="font-size:18px;font-weight:bold;color:#333;">${soldAll}</div>
                            <div style="font-size:10px;color:#888;">Всего продано</div>
                        </div>
                    </div>
            `;

            // Зоны
            if (Object.keys(zoneStats).length > 0) {
                html += `<details style="margin-bottom:8px;"><summary style="cursor:pointer;font-weight:600;font-size:12px;">📊 Зоны (${Object.keys(zoneStats).length})</summary><div style="margin-top:4px;max-height:120px;overflow-y:auto;">`;
                Object.entries(zoneStats).sort((a, b) => b[1] - a[1]).forEach(([zoneId, count]) => {
                    const info = (zonePrices[zoneId] || [])[0] || {};
                    const color = info.c || '#ccc';
                    const price = info.p !== undefined ? ` ${(info.p/100).toFixed(2)}₽` : '';
                    html += `
                        <div style="display:flex;justify-content:space-between;padding:3px 6px;border-bottom:1px solid #f0f0f0;font-size:11px;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <div style="width:10px;height:10px;border-radius:2px;background:${color};border:1px solid #ddd;"></div>
                                <span>Зона ${zoneId}</span>
                                <span style="color:#888;">${info.pTN || ''}</span>
                                <span style="color:#4CAF50;">${price}</span>
                            </div>
                            <span style="background:#f0f0f0;padding:0 6px;border-radius:6px;">${count}</span>
                        </div>
                    `;
                });
                html += `</div></details>`;
            }

            // Сломанные
            if (sortedGroups.length > 0) {
                html += `
                    <div style="border-top:2px solid #e8e8e8;padding-top:8px;">
                        <div style="font-weight:600;color:#d32f2f;font-size:12px;margin-bottom:6px;">🔍 Сломанные (${soldBroken})</div>
                        <div style="display:flex;flex-direction:column;gap:4px;">
                `;
                sortedGroups.forEach(([color, items]) => {
                    const isColor = color && color !== '(без цвета)';
                    html += `
                        <div class="zone-group" style="background:#fff;border-radius:6px;border:1px solid #e8e8e8;overflow:hidden;cursor:pointer;">
                            <div class="zone-header" style="display:flex;justify-content:space-between;padding:8px 12px;background:#fafafa;">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    ${isColor ? `<div style="width:14px;height:14px;border-radius:3px;background:${color};border:1px solid #ddd;"></div>` : ''}
                                    <span style="font-weight:500;font-size:12px;">${color}</span>
                                </div>
                                <span style="background:#f44336;color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;">${items.length}</span>
                            </div>
                            <div class="zone-body" style="display:none;padding:6px 10px;max-height:200px;overflow-y:auto;">
                    `;
                    items.forEach(item => {
                        html += `
                            <div style="display:flex;justify-content:space-between;padding:3px 4px;border-bottom:1px solid #f5f5f5;font-size:11px;">
                                <span style="color:#888;">#${item[idx.id]}</span>
                                <span>Ряд ${item[idx.row]}, м.${item[idx.place]}</span>
                                <span style="color:#999;">x:${item[idx.x]}, y:${item[idx.y]}</span>
                            </div>
                        `;
                    });
                    html += `</div></div>`;
                });
                html += `</div></div>`;
            } else {
                html += `<div style="text-align:center;padding:16px;color:#4CAF50;background:#e8f5e9;border-radius:6px;">✅ Все корректны</div>`;
            }

            html += `</div>`;
            container.innerHTML = html;

            // Обработчики раскрытия
            container.querySelectorAll('.zone-group').forEach(group => {
                const header = group.querySelector('.zone-header');
                const body = group.querySelector('.zone-body');
                let open = false;
                header.addEventListener('click', function() {
                    open = !open;
                    body.style.display = open ? 'block' : 'none';
                    // Закрываем другие
                    container.querySelectorAll('.zone-group').forEach(other => {
                        if (other !== group) {
                            other.querySelector('.zone-body').style.display = 'none';
                            other._open = false;
                        }
                    });
                    group._open = open;
                });
            });

            // Снимаем уведомление
            if (brokenZones.length > 0 && !wasOpenedAfterBrokenFound) {
                wasOpenedAfterBrokenFound = true;
                PanelCore.updateBadge(PLUGIN_ID, 0);
            }
        }

        // Регистрация
        PanelCore.registerPlugin({
            id: PLUGIN_ID,
            name: 'Анализ зон',
            icon: '📊',
            badge: 0,
            priority: 10,
            version: '1.0.1',
            onOpen: function(container) {
                loadData(container);
            }
        });

        console.log('✅ My Plugin: Зарегистрирован');
    });

})();