luna para o próximo passo quero que voce configure o prisma com os seguintes modelos:

User

id: string   Int      @id @default(autoincrement())
username: string
email: string   @unique
password: string
address: string
state: string
city: string

Tasks

id: string   Int      @id @default(autoincrement())
name: string
description: string
scheduled_date: date
task_concluded: boolean

e também conecte ao nosso banco postgresql(pode criar ele no docker)

Após isso crie a rota de auth com o seguinte:

signUp
signIn
refreshToken
editUser

Após o auth crie a rota de tasks com o seguinte:

createTask
editTask
deleteTask
getAllTasks
getTaskById
maskAsComplete

OBS: Só crie tasks após o auth estár totalmente testado e funcional(me informe quando o auth estiver pronto eu irei testar com insominia e direi se pode seguir com o tasks)

Importante: futuramente iremos utilizar rabbbitmq com uma arquitetura orientada a eventos se achar necessário pode criar os serviços auth, tasks e gateway