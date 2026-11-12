import type { WeatherForecastResult } from './weather.schemas.js';

const WMO_WEATHER_CODES: Record<number, { condition: string; willRain: boolean }> = {
  0: { condition: 'Céu limpo', willRain: false },
  1: { condition: 'Predominantemente limpo', willRain: false },
  2: { condition: 'Parcialmente nublado', willRain: false },
  3: { condition: 'Encoberto', willRain: false },
  45: { condition: 'Neblina', willRain: false },
  48: { condition: 'Nevoeiro com geada', willRain: false },
  51: { condition: 'Garoa leve', willRain: true },
  53: { condition: 'Garoa moderada', willRain: true },
  55: { condition: 'Garoa densa', willRain: true },
  61: { condition: 'Chuva leve', willRain: true },
  63: { condition: 'Chuva moderada', willRain: true },
  65: { condition: 'Chuva forte', willRain: true },
  71: { condition: 'Queda de neve leve', willRain: false },
  73: { condition: 'Queda de neve moderada', willRain: false },
  75: { condition: 'Queda de neve intensa', willRain: false },
  80: { condition: 'Pancadas de chuva fracas', willRain: true },
  81: { condition: 'Pancadas de chuva moderadas', willRain: true },
  82: { condition: 'Pancadas de chuva violentas', willRain: true },
  95: { condition: 'Tempestade com trovoadas', willRain: true },
  96: { condition: 'Tempestade com granizo leve', willRain: true },
  99: { condition: 'Tempestade com granizo forte', willRain: true }
};

export class WeatherService {
  async getWeatherForecast(
    latitude: number,
    longitude: number
  ): Promise<WeatherForecastResult | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,precipitation&timezone=auto`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        console.warn(`[WeatherService] Resposta não-200 da API Open-Meteo: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as {
        current?: {
          temperature_2m?: number;
          weather_code?: number;
          precipitation?: number;
        };
      };

      const temperature = data.current?.temperature_2m ?? 22.0;
      const weatherCode = data.current?.weather_code ?? 0;
      const precipitation = data.current?.precipitation ?? 0;

      const weatherInfo = WMO_WEATHER_CODES[weatherCode] || {
        condition: 'Tempo estável',
        willRain: false
      };

      const willRain = weatherInfo.willRain || precipitation > 0;

      let recommendation: string;
      if (willRain) {
        recommendation = '🌧️ Atenção: Previsão de chuva para o local do seu compromisso. Leve um guarda-chuva!';
      } else if (temperature < 16) {
        recommendation = '🧥 Clima ameno/frio no local. Considere levar um agasalho.';
      } else if (temperature > 30) {
        recommendation = '☀️ Dia quente no local do compromisso. Mantenha-se hidratado.';
      } else {
        recommendation = '☀️ Tempo firme e estável para o seu compromisso.';
      }

      return {
        temperature,
        condition: weatherInfo.condition,
        willRain,
        recommendation
      };
    } catch (err) {
      console.warn('[WeatherService] Não foi possível obter previsão meteorológica:', err);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const weatherService = new WeatherService();
