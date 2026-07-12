# 🎯 Tampermonkey Plugins

Универсальная панель управления для Tampermonkey с системой плагинов. 
Позволяет добавлять собственные ярлыки и окна, которые автоматически появляются у всех пользователей.

[![Build and Deploy](https://github.com/kollsan95/tampermonkey-plugins/actions/workflows/build.yml/badge.svg)](https://github.com/kollsan95/tampermonkey-plugins/actions/workflows/build.yml)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-✓-green)](https://www.tampermonkey.net/)

---

## 📦 Структура проекта
	tampermonkey-plugins/
	├── .github/
	│ └── workflows/
	│ └── build.yml # GitHub Actions (автосборка и деплой)
	├── core/
	│ └── panel-core.js # Ядро панели управления (не трогать!)
	├── plugins/
	│ ├── zones-plugin.js # Плагин: зоны зала
	│ └── example-plugin.js # Шаблон для новых плагинов
	├── dist/ # Папка для сборки (создаётся автоматически)
	├── version.json # Файл с версиями всех плагинов
	├── package.json # Управление проектом
	└── README.md # Этот файл

---

## 🚀 Быстрый старт

### Для пользователей:

1. Установи расширение [Tampermonkey](https://www.tampermonkey.net/) для браузера
2. Установи Core:
   - Открой: `https://kollsan95.github.io/tampermonkey-plugins/panel-core.user.js`
   - Нажми **"Установить"**
3. Всё! Плагины будут добавляться автоматически

**Готовые ссылки для установки:**
- **Core:** https://kollsan95.github.io/tampermonkey-plugins/panel-core.user.js
- **Все плагины:** автоматически подтягиваются через Core

### Для разработчиков:

1. Форкни репозиторий: https://github.com/kollsan95/tampermonkey-plugins
2. Клонируй: `git clone https://github.com/yourusername/tampermonkey-plugins.git`
3. Создай новый плагин (см. ниже)

---

## 📝 Как создать новый плагин

### Шаг 1: Скопируй шаблон

```bash
# Перейди в папку plugins
cd plugins

# Скопируй шаблон
cp example-plugin.js my-new-plugin.js


---

## 📋 Краткая памятка для разработчика (шпаргалка)

### Добавление нового плагина:

```bash
# 1. Создай файл
cd plugins
cp example-plugin.js my-new-plugin.js

# 2. Отредактируй my-new-plugin.js
# - измени @name, @description, @author
# - установи PLUGIN_ID
# - напиши логику в onPluginOpen()

# 3. Добавь запись в version.json
# - добавь объект в массив plugins

# 4. Запушь
git add .
git commit -m "feat: добавил плагин my-new-plugin"
git push
