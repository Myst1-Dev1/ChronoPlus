import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';

export interface HourlyForecast {
  time: string;
  hour: string;
  temperature: number;
  condition: string;
  weatherCode: number;
  precipitationProbability: number;
  precipitation: number;
  willRain: boolean;
}

export interface WeatherForecast {
  destination?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  temperature: number;
  condition: string;
  weatherCode: number;
  precipitationProbability: number;
  precipitation?: number;
  willRain?: boolean;
  recommendation: string;
  hourly: HourlyForecast[];
}

export const CONSULTAR_CLIMA_POR_DESTINO_QUERY = gql`
  query ConsultarClimaPorDestino($destination: String!) {
    getWeatherByDestination(destination: $destination) {
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
`;

interface GetWeatherByDestinationResponse {
  getWeatherByDestination: WeatherForecast;
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly apollo = inject(Apollo);

  getWeatherByDestination(destination: string = 'São Gonçalo, Rio de Janeiro, Brasil'): Observable<WeatherForecast> {
    return this.apollo
      .query<GetWeatherByDestinationResponse>({
        query: CONSULTAR_CLIMA_POR_DESTINO_QUERY,
        variables: { destination },
        fetchPolicy: 'cache-first'
      })
      .pipe(
        map((result) => {
          if (!result.data?.getWeatherByDestination) {
            throw new Error('Informações de clima não disponíveis para o destino informado.');
          }
          return result.data.getWeatherByDestination;
        })
      );
  }
}
