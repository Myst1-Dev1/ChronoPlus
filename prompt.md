luna agora para agendamentos vamos criar os reminders com o seguinte modelo no prisma:

Reminders

id: string      @id @default(uuid())
reminder_name: string
reminder_description
reminder_time: string
reminder_date: date
reminder_repeat: boolean
reminder_notify: string

OBS: Assim como foi nas tasks vamos usar graphql também e teremos notificações sobre os agendamentos.

Importante: Após os agendamentos estarem totalmente funcionais, vamos criar um modulo de geolocalizaçao pois eu quero o seguinte: o usuário fez um agendamento de consulta no médico para dia tal em endereço tal ai além de notificar o usuário sobre o dia eu quero também falar sobre o clima do local se vai chover ou não para o usuário se preparar. Então na model do prisma de reminders vamos precisar ter como campos opcionais a latitude e longitude para definir o clima do local baseado na geolocalização, é claro somente se o lembrete for um compromisso em um lugar tal, se for só um lembrete sobre sei la bebe agua ai não teria necessidade, mas por isso latitude e longitude são opcionais. Enfim me diga se prefere fazer os dois agora ou um de cada vez.