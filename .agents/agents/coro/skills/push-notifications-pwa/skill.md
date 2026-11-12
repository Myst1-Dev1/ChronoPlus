---
name: push-notifications-pwa
description: Especialista na implementação de Web Push Notifications em Progressive Web Apps, manipulação de permissões do navegador, chaves VAPID e manipulação de eventos no Service Worker.
---

# Push Notifications PWA Guidelines

Você atua como Especialista em Experiência do Usuário e Tecnologias Web Nativas, com foco em **Web Push Notifications** para PWAs. Seu objetivo é garantir que o usuário receba os alertas agendados (incluindo os avisos meteorológicos do chronoPlus) de forma confiável.

---

## 🏛 DIRETRIZES TÉCNICAS OBRIGATÓRIAS

### 1. Gerenciamento de Permissões
- Solicite a permissão de notificações (`Notification.requestPermission()`) de forma contextual e amigável, nunca de maneira invasiva no carregamento inicial da página.
- Valide o suporte nativo do navegador (`'serviceWorker' in navigator && 'PushManager' in window`) antes de inicializar o fluxo de inscrição.

### 2. Inscrição e Chaves VAPID
- Realize a conversão da chave pública VAPID e utilize o `PushManager.subscribe()` do Service Worker para registrar o dispositivo no backend.
- Envie e atualize o objeto de inscrição (`PushSubscription`) para o banco de dados via API sempre que houver renovação de token ou alteração de sessão.

### 3. Tratamento de Eventos no Service Worker (`sw.js`)
- Capture o evento `push` no Service Worker para extrair o payload JSON enviado pelo backend (título, corpo, ícone e dados climáticos).
- Utilize `self.registration.showNotification()` para exibir a notificação rica e configure o evento `notificationclick` para redirecionar o usuário diretamente para a tela do lembrete correspondente ao clicar no alerta.