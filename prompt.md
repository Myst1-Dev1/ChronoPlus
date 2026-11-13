Coro, preciso que você construa a página de dashboard do chronoPlus baseada no design presente em `front/public/design/dashboard.png`.

Por favor, siga estas diretrizes arquiteturais e visuais:

1. Componentização Reutilizável & UI:
   - Estruture a tela utilizando componentes **Standalone** reutilizáveis.
   - Instale e utilize a biblioteca **`lucide-angular`** para os ícones da interface (como o seletor de tema, ícones do menu inferior, relógio, etc.).
   - Crie um componente de **Header** que será reutilizado em outras páginas.
   - Crie um componente de **Navbar** inferior (com abas de Início, Agenda, Clima e Perfil) que será reutilizado em outras páginas.

2. Dark Mode:
   - Implemente o suporte a Dark Mode seguindo as melhores práticas do Angular (alternando classes globais ou tokens de tema no DOM de forma reativa).

3. Conexão com o Back-end (GraphQL):
   - Consuma a API do GraphQL para buscar os dados dos lembretes em: `http://localhost:3000/graphql`.
   - Utilize a seguinte query para carregar os registros:
     query {
       getAllReminders {
         id
         reminderName
         reminderDescription
         reminderTime
         reminderDate
         reminderRepeat
         reminderNotify
       }
     }

4. Se não tiver nenhuma task exiba em tela: Você não possui tarefas e exiba baseado no dia atual.

Por favor, aplique essas alterações diretamente nos arquivos do projeto e me informe o que foi configurado.