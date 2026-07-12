// ==UserScript==
// @name         My New Plugin - Анализ зон
// @namespace    https://github.com/kollsan95/tampermonkey-plugins
// @version      1.0.0
// @description  Анализ зон карты зала: поиск сломанных зон в секторе
// @author       kollsan95
// @match        *://*/*#/session/*/map/section/*
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_cookie
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const PLUGIN_ID = 'my-new-plugin';

    // ============================================================
    // 1. ОЖИДАНИЕ ЗАГРУЗКИ CORE
    // ============================================================

    function waitForCore(callback, attempt) {
        attempt = attempt || 0;
        const maxAttempts = 30; // 30 * 100мс = 3 секунды

        if (typeof PanelCore !== 'undefined' && PanelCore.registerPlugin) {
            console.log('✅ My Plugin: Core найден, регистрируемся...');
            callback();
            return;
        }

        if (attempt >= maxAttempts) {
            console.error('❌ My Plugin: Core не найден после ' + maxAttempts + ' попыток');
            return;
        }

        console.log(`⏳ My Plugin: Ожидание Core (попытка ${attempt + 1}/${maxAttempts})...`);
        setTimeout(function() {
            waitForCore(callback, attempt + 1);
        }, 100);
    }

    // ============================================================
    // 2. ПРОВЕРКА URL
    // ============================================================

    function isValidPage() {
        const hash = window.location.hash;
        return hash.match(/\/session\/\d+\/map\/section\/\d+/);
    }

    // Если страница не подходит — выходим
    if (!isValidPage()) {
        console.log('ℹ️ My Plugin: Не подходящая страница (нужен #/session/*/map/section/*)');
        return;
    }

    // ============================================================
    // 3. ОСНОВНАЯ ЛОГИКА ПЛАГИНА
    // ============================================================

    function initPlugin() {
        // Проверяем, не зарегистрирован ли уже плагин
        if (PanelCore.getPlugin(PLUGIN_ID)) {
            console.log('ℹ️ My Plugin: Уже зарегистрирован');
            return;
        }

        console.log('🚀 My Plugin: Инициализация...');

        // Флаг для уведомления
        let wasOpenedAfterBrokenFound = false;

        // ============================================================
        // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
        // ============================================================

        function getSessionId() {
            const hash = window.location.hash;
            const match = hash.match(/\/session\/(\d+)/);
            return match ? match[1] : null;
        }

        function getSectionId() {
            const hash = window.location.hash;
            const match = hash.match(/\/section\/(\d+)/);
            return match ? match[1] : null;
        }

        function getApiBaseUrl() {
            return window.location.origin;
        }

        function formatPrice(priceInCents) {
            if (priceInCents === undefined || priceInCents === null) return '';
            return `${(priceInCents / 100).toFixed(2)} руб.`;
        }

        // ============================================================
        // ПОЛУЧЕНИЕ ТОКЕНА
        // ============================================================

        function getTokenFromCookies() {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'token' || name === 'access_token' || name === 'auth_token') {
                    return value;
                }
            }
            return null;
        }

        function getTokenFromStorage() {
            try {
                const token = localStorage.getItem('token') || 
                             localStorage.getItem('access_token') || 
                             sessionStorage.getItem('token') ||
                             sessionStorage.getItem('access_token');
                if (token) return token;
            } catch (e) {
                console.warn('⚠️ My Plugin: Не удалось прочитать storage:', e);
            }
            return null;
        }

        function getToken() {
            let token = getTokenFromCookies();
            if (token) {
                console.log('🔑 My Plugin: Токен получен из кук');
                return token;
            }

            token = getTokenFromStorage();
            if (token) {
                console.log('🔑 My Plugin: Токен получен из storage');
                return token;
            }

            console.warn('⚠️ My Plugin: Токен не найден');
            return null;
        }

        // ============================================================
        // ЗАПРОС С АВТОРИЗАЦИЕЙ
        // ============================================================

        function makeAuthorizedRequest(url, callback) {
            const token = getToken();
            
            if (!token) {
                console.error('❌ My Plugin: Нет токена для авторизации');
                if (callback) callback({ status: 401, error: 'No token' });
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
                    if (callback) callback(response);
                },
                onerror: function(error) {
                    console.error('❌ My Plugin: Ошибка запроса:', error);
                    if (callback) callback({ status: 0, error: error });
                }
            });
        }

        // ============================================================
        // ЗАГРУЗКА ДАННЫХ
        // ============================================================

        function loadData(container) {
            const sessionId = getSessionId();
            const sectionId = getSectionId();

            if (!sessionId) {
                container.innerHTML = `
                    <div style="color:#999;text-align:center;padding:30px;">
                        ❌ ID сессии не найден в URL
                    </div>
                `;
                return;
            }

            if (!sectionId) {
                container.innerHTML = `
                    <div style="color:#999;text-align:center;padding:30px;">
                        ❌ ID сектора не найден в URL
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div style="text-align:center;padding:30px;color:#999;">
                    ⏳ Загрузка данных для сектора ${sectionId}...
                </div>
            `;

            console.log(`📡 My Plugin: Сессия ${sessionId}, Сектор ${sectionId}`);

            const mapUrl = `${getApiBaseUrl()}/api/v1/session/${sessionId}/map/section/${sectionId}/places/slim?ignoreSell=true`;
            const sessionUrl = `${getApiBaseUrl()}/api/v1/session/${sessionId}?expand=performance,zones,distributorContracts,sessions,institution,distributorTickets`;

            let mapData = null;
            let sessionData = null;
            let completedRequests = 0;

            function checkComplete() {
                completedRequests++;
                if (completedRequests === 2) {
                    try {
                        processData(container, mapData, sessionData);
                    } catch (e) {
                        container.innerHTML = `
                            <div style="color:#d32f2f;text-align:center;padding:20px;">
                                ❌ Ошибка обработки данных: ${e.message}
                            </div>
                        `;
                        console.error('❌ My Plugin: Ошибка обработки:', e);
                    }
                }
            }

            // Запрос 1: Карта зала
            makeAuthorizedRequest(mapUrl, function(response) {
                if (response.status === 200) {
                    try {
                        mapData = JSON.parse(response.responseText);
                        console.log(`✅ My Plugin: Данные карты загружены (сектор ${sectionId})`);
                    } catch (e) {
                        console.error('❌ My Plugin: Ошибка парсинга карты:', e);
                    }
                } else if (response.status === 401) {
                    container.innerHTML = `
                        <div style="color:#d32f2f;text-align:center;padding:20px;">
                            ❌ Ошибка авторизации (401). Проверьте токен.
                        </div>
                    `;
                    console.error('❌ My Plugin: Ошибка авторизации 401');
                } else {
                    console.error(`❌ My Plugin: Ошибка карты (${response.status})`);
                }
                checkComplete();
            });

            // Запрос 2: Информация о сессии
            makeAuthorizedRequest(sessionUrl, function(response) {
                if (response.status === 200) {
                    try {
                        sessionData = JSON.parse(response.responseText);
                        console.log('✅ My Plugin: Данные сессии загружены');
                    } catch (e) {
                        console.error('❌ My Plugin: Ошибка парсинга сессии:', e);
                    }
                } else if (response.status === 401) {
                    container.innerHTML = `
                        <div style="color:#d32f2f;text-align:center;padding:20px;">
                            ❌ Ошибка авторизации (401). Проверьте токен.
                        </div>
                    `;
                    console.error('❌ My Plugin: Ошибка авторизации 401');
                } else {
                    console.error(`❌ My Plugin: Ошибка сессии (${response.status})`);
                }
                checkComplete();
            });
        }

        // ============================================================
        // ОБРАБОТКА ДАННЫХ
        // ============================================================

        function processData(container, mapData, sessionData) {
            if (!mapData || !mapData.data) {
                container.innerHTML = `
                    <div style="color:#d32f2f;text-align:center;padding:20px;">
                        ❌ Не удалось загрузить данные карты
                    </div>
                `;
                return;
            }

            if (!sessionData || !sessionData.zones) {
                container.innerHTML = `
                    <div style="color:#d32f2f;text-align:center;padding:20px;">
                        ❌ Не удалось загрузить данные сессии
                    </div>
                `;
                return;
            }

            const schema = mapData.schema;
            const data = mapData.data;
            const zonePrices = sessionData.zonePrices || {};

            const idIndex = schema.indexOf('id');
            const zoneIdIndex = schema.indexOf('zoneId');
            const typeIndex = schema.indexOf('type');
            const colorIndex = schema.indexOf('color');
            const rowIndex = schema.indexOf('row');
            const placeIndex = schema.indexOf('place');
            const xIndex = schema.indexOf('x');
            const yIndex = schema.indexOf('y');
            const availableIndex = schema.indexOf('available');

            const allPlaces = data.filter(item => item[typeIndex] === '0');
            const brokenZones = allPlaces.filter(item => 
                item[zoneIdIndex] === 0 && !item[availableIndex]
            );

            // Управление уведомлением
            if (brokenZones.length > 0 && !wasOpenedAfterBrokenFound) {
                PanelCore.updateBadge(PLUGIN_ID, 1);
                console.log(`🔴 My Plugin: Обнаружено ${brokenZones.length} сломанных зон`);
            } else if (brokenZones.length === 0) {
                PanelCore.updateBadge(PLUGIN_ID, 0);
            }

            const currentBrokenCount = brokenZones.length;
            const validPlaces = allPlaces.filter(item => item[zoneIdIndex] > 0);

            const zoneStats = {};
            validPlaces.forEach(item => {
                const zoneId = item[zoneIdIndex];
                if (zoneId > 0) {
                    zoneStats[zoneId] = (zoneStats[zoneId] || 0) + 1;
                }
            });

            const soldAll = allPlaces.filter(item => !item[availableIndex]).length;
            const soldValid = validPlaces.filter(item => !item[availableIndex]).length;
            const soldBroken = brokenZones.length;

            const byColor = {};
            brokenZones.forEach(item => {
                const color = item[colorIndex] || '(без цвета)';
                if (!byColor[color]) byColor[color] = [];
                byColor[color].push(item);
            });

            const sortedGroups = Object.entries(byColor).sort((a, b) => b[1].length - a[1].length);
            const sectionId = getSectionId();

            let html = `
                <div style="padding:4px 0;">
                    <div style="margin-bottom:10px;padding:6px 10px;background:#e3f2fd;border-radius:6px;font-size:12px;color:#1565c0;display:flex;justify-content:space-between;align-items:center;">
                        <span>📍 Сектор ${sectionId}</span>
                        <span style="font-weight:500;">Сессия ${getSessionId()}</span>
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
                    <details style="margin-bottom:8px;">
                        <summary style="cursor:pointer;font-weight:600;color:#555;font-size:12px;padding:4px 0;">
                            📊 Распределение по зонам (${Object.keys(zoneStats).length} зон)
                        </summary>
                        <div style="margin-top:4px;max-height:120px;overflow-y:auto;">
            `;

            const sortedZones = Object.entries(zoneStats).sort((a, b) => b[1] - a[1]);
            sortedZones.forEach(([zoneId, count]) => {
                const info = (zonePrices[zoneId] || [])[0] || {};
                const name = info.pTN || zoneId;
                const price = info.p !== undefined ? formatPrice(info.p) : '';
                const color = info.c || '#ccc';
                
                html += `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 6px;border-bottom:1px solid #f0f0f0;font-size:11px;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <div style="width:10px;height:10px;border-radius:2px;background:${color};border:1px solid #ddd;"></div>
                            <span>Зона ${zoneId}</span>
                            <span style="color:#888;font-size:10px;">${name}</span>
                            ${price ? `<span style="color:#4CAF50;font-size:10px;">${price}</span>` : ''}
                        </div>
                        <span style="background:#f0f0f0;padding:0 6px;border-radius:6px;font-weight:500;font-size:11px;">${count}</span>
                    </div>
                `;
            });

            html += `
                        </div>
                    </details>
            `;

            if (sortedGroups.length > 0) {
                html += `
                    <div style="border-top:2px solid #e8e8e8;padding-top:8px;margin-top:4px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-weight:600;color:#d32f2f;font-size:12px;">
                                🔍 Сломанные зоны (${soldBroken})
                            </span>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:4px;">
                `;

                sortedGroups.forEach(([color, items]) => {
                    const colorDisplay = color || '(без цвета)';
                    const isColor = color && color !== '(без цвета)';
                    
                    html += `
                        <div class="zone-group" style="background:#fff;border-radius:6px;border:1px solid #e8e8e8;overflow:hidden;cursor:pointer;transition:all 0.2s;">
                            <div class="zone-header" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#fafafa;border-bottom:1px solid #e8e8e8;">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    ${isColor ? `<div style="width:14px;height:14px;border-radius:3px;background:${color};border:1px solid #ddd;"></div>` : ''}
                                    <span style="font-weight:500;font-size:12px;">${colorDisplay}</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <span style="background:#f44336;color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;">${items.length}</span>
                                    <span class="arrow" style="font-size:10px;color:#999;transition:transform 0.2s;">▼</span>
                                </div>
                            </div>
                            <div class="zone-body" style="display:none;padding:6px 10px;max-height:200px;overflow-y:auto;">
                    `;

                    items.forEach((item) => {
                        const id = item[idIndex];
                        const row = item[rowIndex];
                        const place = item[placeIndex];
                        const x = item[xIndex];
                        const y = item[yIndex];
                        
                        html += `
                            <div style="display:flex;justify-content:space-between;padding:3px 4px;border-bottom:1px solid #f5f5f5;font-size:11px;">
                                <span style="color:#888;">#${id}</span>
                                <span>Ряд ${row}, место ${place}</span>
                                <span style="color:#999;font-size:10px;">x:${x}, y:${y}</span>
                            </div>
                        `;
                    });

                    html += `
                            </div>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div style="text-align:center;padding:16px;color:#4CAF50;background:#e8f5e9;border-radius:6px;border:1px solid #c8e6c9;margin-top:6px;font-size:13px;">
                        ✅ Все зрительские места имеют корректную zoneId
                    </div>
                `;
            }

            html += `</div>`;
            container.innerHTML = html;

            // Обработчики кликов для раскрытия плиток
            container.querySelectorAll('.zone-group').forEach(group => {
                const header = group.querySelector('.zone-header');
                const body = group.querySelector('.zone-body');
                const arrow = group.querySelector('.arrow');

                header.addEventListener('click', function(e) {
                    e.stopPropagation();
                    
                    container.querySelectorAll('.zone-group').forEach(otherGroup => {
                        if (otherGroup !== group) {
                            const otherBody = otherGroup.querySelector('.zone-body');
                            const otherArrow = otherGroup.querySelector('.arrow');
                            if (otherBody && otherBody.style.display !== 'none') {
                                otherBody.style.display = 'none';
                                if (otherArrow) otherArrow.textContent = '▼';
                            }
                        }
                    });

                    const isOpen = body.style.display !== 'none';
                    body.style.display = isOpen ? 'none' : 'block';
                    arrow.textContent = isOpen ? '▼' : '▲';
                });
            });

            if (currentBrokenCount > 0 && !wasOpenedAfterBrokenFound) {
                wasOpenedAfterBrokenFound = true;
                PanelCore.updateBadge(PLUGIN_ID, 0);
                console.log('🟢 My Plugin: Уведомление снято (окно открыто)');
            }

            console.log('✅ My Plugin: Данные отображены');
        }

        // ============================================================
        // РЕГИСТРАЦИЯ ПЛАГИНА
        // ============================================================

        PanelCore.registerPlugin({
            id: PLUGIN_ID,
            name: 'Анализ зон',
            icon: '📊',
            badge: 0,
            priority: 10,
            version: '1.0.0',
            onOpen: function(container) {
                loadData(container);
            },
            onClose: function() {
                console.log('📊 My Plugin: Закрыт');
            }
        });

        console.log('✅ My Plugin: Зарегистрирован');
    }

    // ============================================================
    // ЗАПУСК С ОЖИДАНИЕМ CORE
    // ============================================================

    waitForCore(initPlugin);

})();