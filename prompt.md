Coro, preciso que você crie a página de clima baseado no design presente em `front/public/design/Clima.png`.

Por favor, siga estas diretrizes arquiteturais e visuais:

1. Componentização Reutilizável & UI:
   - Utilize a biblioteca **`lucide-angular`** para os ícones.

2. Interação:
   - O modal deve abrir de forma fluida ao clicar no botão "+ Criar lembrete" presente na agenda.

3. Conexão com o Back-end (GraphQL):
   - Consuma a API do GraphQL para persistir os dados em: `http://localhost:3000/graphql`.
   - Utilize a seguinte query para pegar informações do clima:                   
	query ConsultarClimaPorDestino {
  getWeatherByDestination(destination: "São Gonçalo, Rio de Janeiro, Brasil") {
    destination
    latitude
    longitude
    temperature
    condition
    weatherCode
    precipitationProbability
    recommendation
    hourly {
      time
      hour
      temperature
      condition
      weatherCode
      precipitationProbability
      precipitation
      willRain
    }
  }
}

Por favor, aplique essas alterações diretamente nos arquivos do projeto e me informe o que foi configurado.