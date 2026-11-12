Coro, preciso que você construa a página inicial de Login do chronoPlus baseada no design presente em `front/public/design/Login (1).png`.

Por favor, siga estas diretrizes arquiteturais e visuais:

1. Componentização Reutilizável & UI:
   - Estruture a tela utilizando componentes **Standalone** reutilizáveis.
   - Instale e utilize a biblioteca **`lucide-angular`** para os ícones da interface.
   - Crie um componente de **Loading** reutilizável (spinner/indicador de carregamento) para ser acionado durante o envio do formulário.

2. Validação com Zod:
   - Utilize **Zod** para criar o esquema de validação do formulário de login (validando e-mail válido e senha com requisitos mínimos de caracteres).
   - Exiba mensagens de erro claras e amigáveis diretamente na interface conforme a digitação ou tentativa de envio.

3. Conexão com o Back-end (REST):
   - Conecte o formulário diretamente ao endpoint REST de autenticação do backend: `http://localhost:3000/auth/sign-in`.
   - Gerencie os estados de loading, sucesso e erro de forma reativa (utilizando Signals ou RxJS), armazenando o token JWT retornado no localStorage/sessionStorage e redirecionando o usuário para o dashboard.

Por favor, aplique essas alterações diretamente nos arquivos do projeto e me informe o que foi configurado.