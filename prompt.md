Coro, preciso que você construa o modal de criação de lembretes do chronoPlus baseado no design presente em `front/public/design/Modal.png`.

Por favor, siga estas diretrizes arquiteturais e visuais:

1. Componentização Reutilizável & UI:
   - Utilize a biblioteca **`lucide-angular`** para os ícones do modal (fechar, calendário, relógio, etc.).
   - Crie um componente de **Modal** genérico e reutilizável para a aplicação.

2. Interação:
   - O modal deve abrir de forma fluida ao clicar no botão "+ Nova tarefa" presente no dashboard.

3. Conexão com o Back-end (GraphQL):
   - Consuma a API do GraphQL para persistir os dados em: `http://localhost:3000/graphql`.
   - Utilize a seguinte mutation para enviar os registros:
     mutation {                    
	createTask(input: {                                                                                
		name: "Apresentar projeto ChronoPlus"                                                            
		description: "Reunião de alinhamento com stakeholders"                                           
		scheduledDate: "2026-11-15T14:30:00.000Z"                                                        
	}) {                                                                                               
		id                                                                                               
		name                                                                                             
		description                                                                                      
		scheduledDate                                                                                    
		taskConcluded                                                                                    
		createdAt                                                                                        
	}                                                                                                  
}

Por favor, aplique essas alterações diretamente nos arquivos do projeto e me informe o que foi configurado.