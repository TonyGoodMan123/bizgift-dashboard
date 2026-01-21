# Архив Firebase Auth

Эта ветка содержит полную реализацию Firebase Authentication для будущего использования.

## Что здесь сохранено:

- **Firebase Auth** — полная аутентификация по email/password
- **Firestore** — хранение профилей пользователей
- **Admin Panel** — управление пользователями
- **Serverless API** — `/api/users/*` endpoints
- **Protected Routes** — проверка доступов по ролям

## Как вернуть Firebase Auth:

```bash
# Переключиться на эту ветку
git checkout archive/firebase-auth

# Посмотреть что здесь было
git log

# Скопировать нужные файлы обратно в main
git checkout main
git checkout archive/firebase-auth -- src/context/AuthContext.tsx
git checkout archive/firebase-auth -- src/App.tsx
# и т.д.
```

## Файлы в архиве:

- `src/context/AuthContext.tsx` — Firebase Auth контекст
- `src/components/ProtectedRoute.tsx` — защищённые роуты
- `src/pages/Login.tsx` — страница входа
- `api/_firebase.ts` — Firebase Admin SDK
- `api/users/create.ts` — создание пользователя
- `api/users/delete.ts` — удаление
- `api/users/reset-password.ts` — сброс пароля

**Дата создания архива:** 2026-01-21
**Последний коммит main:** 2a81d0d9
