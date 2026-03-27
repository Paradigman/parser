# GVE Character Deposits Parser

Парсер журнала транзакций персонажей для Interlude-Online GVE.

## Возможности

- Парсинг всех страниц истории транзакций
- Агрегация депозитов по имени персонажа
- Сортировка по сумме, количеству транзакций, имени
- Поиск по имени персонажа
- Отображение последнего депозита
- Сохранение куки в localStorage

## Деплой на Vercel

### 1. Подготовка

```bash
# Установка зависимостей
npm install

# Проверка локально
npm run dev
```

### 2. Деплой

1. Перейдите на [vercel.com](https://vercel.com)
2. Войдите через GitHub
3. Нажмите "Import Project"
4. Выберите репозиторий с этим проектом
5. Нажмите "Deploy"

Или через CLI:

```bash
npm i -g vercel
vercel
```

## Использование

1. Откройте приложение
2. Войдите на [interlude-online.com](https://interlude-online.com/auth.html) в браузере
3. Откройте DevTools (F12) → Application → Cookies → https://interlude-online.com
4. Найдите `JSESSIONID` с Path = `/` (не /js и не /i)
5. Скопируйте значение и вставьте в формате: `JSESSIONID=значение`
6. Укажите ID персонажа (опционально)
7. Нажмите "Загрузить данные"

## Технологии

- Next.js 16
- TypeScript
- Tailwind CSS
- Vercel (хостинг)

## Безопасность

- Куки хранятся только в вашем браузере (localStorage)
- Куки отправляются только на interlude-online.com
- Никакие данные не сохраняются на сервере
