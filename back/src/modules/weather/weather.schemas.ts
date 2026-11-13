export const weatherGqlSchema = `
  type HourlyWeatherForecast {
    time: String!
    hour: String!
    temperature: Float!
    condition: String!
    weatherCode: Int!
    precipitationProbability: Int!
    precipitation: Float!
    willRain: Boolean!
  }

  type WeatherForecast {
    destination: String
    latitude: Float
    longitude: Float
    temperature: Float!
    condition: String!
    weatherCode: Int!
    precipitationProbability: Int!
    precipitation: Float!
    willRain: Boolean!
    recommendation: String!
    hourly: [HourlyWeatherForecast!]!
  }

  extend type Query {
    getWeatherByDestination(destination: String!, date: String): WeatherForecast!
    getWeatherForReminder(id: ID!): WeatherForecast
    getWeatherForecast(latitude: Float!, longitude: Float!, date: String): WeatherForecast
  }
`;

export interface HourlyWeatherForecastItem {
  time: string;
  hour: string;
  temperature: number;
  condition: string;
  weatherCode: number;
  precipitationProbability: number;
  precipitation: number;
  willRain: boolean;
}

export interface WeatherForecastResult {
  destination?: string | null;
  latitude?: number;
  longitude?: number;
  temperature: number;
  condition: string;
  weatherCode: number;
  precipitationProbability: number;
  precipitation: number;
  willRain: boolean;
  recommendation: string;
  hourly: HourlyWeatherForecastItem[];
}

