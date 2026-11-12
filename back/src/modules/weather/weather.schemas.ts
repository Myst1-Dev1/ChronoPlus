export const weatherGqlSchema = `
  type WeatherForecast {
    temperature: Float!
    condition: String!
    willRain: Boolean!
    recommendation: String!
  }

  extend type Query {
    getWeatherForReminder(id: ID!) : WeatherForecast
  }
`;

export interface WeatherForecastResult {
  temperature: number;
  condition: string;
  willRain: boolean;
  recommendation: string;
}
