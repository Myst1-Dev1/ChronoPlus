import type { HourlyWeatherForecastItem, WeatherForecastResult } from './weather.schemas.js';

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
  56: { condition: 'Garoa congelante leve', willRain: true },
  57: { condition: 'Garoa congelante densa', willRain: true },
  61: { condition: 'Chuva leve', willRain: true },
  63: { condition: 'Chuva moderada', willRain: true },
  65: { condition: 'Chuva forte', willRain: true },
  66: { condition: 'Chuva congelante leve', willRain: true },
  67: { condition: 'Chuva congelante forte', willRain: true },
  71: { condition: 'Queda de neve leve', willRain: false },
  73: { condition: 'Queda de neve moderada', willRain: false },
  75: { condition: 'Queda de neve intensa', willRain: false },
  77: { condition: 'Grãos de neve', willRain: false },
  80: { condition: 'Pancadas de chuva', willRain: true },
  81: { condition: 'Pancadas de chuva moderadas', willRain: true },
  82: { condition: 'Pancadas de chuva violentas', willRain: true },
  85: { condition: 'Pancadas de neve leves', willRain: false },
  86: { condition: 'Pancadas de neve fortes', willRain: false },
  95: { condition: 'Tempestade com trovoadas', willRain: true },
  96: { condition: 'Tempestade com granizo leve', willRain: true },
  99: { condition: 'Tempestade com granizo forte', willRain: true }
};

interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
    precipitation?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    weather_code?: number[];
    precipitation?: number[];
  };
}

export interface GeocodingResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export class WeatherService {
  /**
   * Geocodifica um destino textual utilizando estratégia combinada híbrida:
   * 1. Nominatim (OpenStreetMap) para resolução precisa de ruas, bairros e logradouros.
   * 2. Open-Meteo Geocoding para busca rápida de cidades, capitais e municípios.
   * 3. Decomposição inteligente da direita para a esquerda (fallback para município/região).
   */
  async geocodeDestination(destination: string): Promise<GeocodingResult | null> {
    const normalized = destination.replace(/\r?\n+/g, ', ').trim();
    if (!normalized) return null;

    // Helper: Nominatim (OpenStreetMap) - Excelente para logradouros e endereços completos
    const fetchNominatim = async (term: string): Promise<GeocodingResult | null> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(term)}&format=json&limit=1&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'ChronoPlus/1.0 (dev@chronoplus.local)',
            'Accept-Language': 'pt-BR,pt;q=0.9'
          },
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (!res.ok) return null;

        const data = (await res.json()) as Array<{
          lat: string;
          lon: string;
          display_name: string;
          address?: {
            city?: string;
            town?: string;
            municipality?: string;
            state?: string;
            country?: string;
            suburb?: string;
            road?: string;
          };
        }>;

        if (!data || data.length === 0 || !data[0]) return null;

        const first = data[0];
        const addr = first.address;
        const city = addr?.city || addr?.town || addr?.municipality || addr?.suburb || first.display_name.split(',')[0];
        const state = addr?.state;
        const country = addr?.country || 'Brasil';
        const formattedAddress = [addr?.road, city, state, country].filter(Boolean).join(', ');

        return {
          name: city || normalized,
          admin1: state,
          country,
          latitude: parseFloat(first.lat),
          longitude: parseFloat(first.lon),
          formattedAddress: formattedAddress || first.display_name
        };
      } catch {
        return null;
      }
    };

    // Helper: Open-Meteo Geocoding - Rápido para cidades e municípios
    const fetchOpenMeteo = async (term: string): Promise<GeocodingResult | null> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(term)}&count=1&language=pt&format=json`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return null;

        const data = (await res.json()) as {
          results?: Array<{
            name: string;
            latitude: number;
            longitude: number;
            admin1?: string;
            country?: string;
          }>;
        };

        const first = data.results?.[0];
        if (!first) return null;

        const addressParts = [first.name, first.admin1, first.country].filter(Boolean);
        return {
          name: first.name,
          admin1: first.admin1,
          country: first.country,
          latitude: first.latitude,
          longitude: first.longitude,
          formattedAddress: addressParts.join(', ')
        };
      } catch {
        return null;
      }
    };

    // 1. Se contém indícios de endereço específico (rua, av, traço ou vírgula), consulta Nominatim primeiro
    const hasStreetIndicators =
      /\b(rua|av|avenida|travessa|estrada|alameda|rodovia|praça)\b/i.test(normalized) ||
      normalized.includes('-') ||
      normalized.includes(',');

    if (hasStreetIndicators) {
      const nomResult = await fetchNominatim(normalized);
      if (nomResult) {
        return nomResult;
      }
    }

    // 2. Consulta Open-Meteo com a string normalizada
    let result = await fetchOpenMeteo(normalized);
    if (result) return result;

    // 3. Fallback no Nominatim se não foi tentado antes
    if (!hasStreetIndicators) {
      result = await fetchNominatim(normalized);
      if (result) return result;
    }

    // 4. Decomposição inteligente da direita para a esquerda (Opção 1)
    // Decompõe segmentos e busca do município/região até o bairro
    const segments = normalized
      .split(/[,-]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && !/^(rua|av|avenida|travessa|alameda)\b/i.test(s));

    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      if (seg) {
        const segOpenMeteo = await fetchOpenMeteo(seg);
        if (segOpenMeteo) return segOpenMeteo;

        const segNom = await fetchNominatim(seg);
        if (segNom) return segNom;
      }
    }

    return null;
  }

  /**
   * Obtém o clima completo (resumo + série horária) a partir do nome de um destino (input textual).
   */
  async getWeatherByDestination(
    destination: string,
    targetDateTime?: Date | string
  ): Promise<WeatherForecastResult | null> {
    const geo = await this.geocodeDestination(destination);
    if (!geo) {
      return null;
    }

    const forecast = await this.getWeatherForecast(geo.latitude, geo.longitude, targetDateTime);
    if (!forecast) {
      return null;
    }

    return {
      ...forecast,
      destination: geo.formattedAddress,
      latitude: geo.latitude,
      longitude: geo.longitude
    };
  }

  /**
   * Obtém a previsão meteorológica atual e horária para uma coordenada geográfica.
   * Suporta direcionamento temporal opcional (targetDateTime) para sincronizar o clima
   * com o horário agendado de compromissos/lembretes.
   */
  async getWeatherForecast(
    latitude: number,
    longitude: number,
    targetDateTime?: Date | string
  ): Promise<WeatherForecastResult | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,precipitation&hourly=temperature_2m,precipitation_probability,weather_code,precipitation&forecast_days=7&timezone=auto`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        console.warn(`[WeatherService] Resposta não-200 da API Open-Meteo: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as OpenMeteoResponse;

      const hourlyTimes = data.hourly?.time ?? [];
      const hourlyTemp = data.hourly?.temperature_2m ?? [];
      const hourlyProb = data.hourly?.precipitation_probability ?? [];
      const hourlyCodes = data.hourly?.weather_code ?? [];
      const hourlyPrecip = data.hourly?.precipitation ?? [];

      // Extrai data e hora desejada (se informada) para previsão pontual do compromisso
      let targetDateStr: string | null = null;
      let targetHourStr: string | null = null;

      if (targetDateTime) {
        if (typeof targetDateTime === 'string') {
          const match = targetDateTime.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}))?/);
          if (match) {
            targetDateStr = match[1] ?? null;
            targetHourStr = match[2] ?? null;
          }
        } else if (targetDateTime instanceof Date) {
          const iso = targetDateTime.toISOString();
          targetDateStr = iso.slice(0, 10);
          targetHourStr = iso.slice(11, 13);
        }
      }

      // Localiza o índice na série temporal horária
      let targetIndex = -1;
      if (targetDateStr && targetHourStr) {
        targetIndex = hourlyTimes.findIndex((t) => t.startsWith(`${targetDateStr}T${targetHourStr}`));
      }
      if (targetIndex === -1 && targetDateStr) {
        targetIndex = hourlyTimes.findIndex((t) => t.startsWith(targetDateStr));
      }

      let temperature: number;
      let weatherCode: number;
      let precipitation: number;
      let precipitationProbability: number;

      if (targetIndex >= 0) {
        temperature = hourlyTemp[targetIndex] ?? (data.current?.temperature_2m ?? 22.0);
        weatherCode = hourlyCodes[targetIndex] ?? (data.current?.weather_code ?? 0);
        precipitation = hourlyPrecip[targetIndex] ?? (data.current?.precipitation ?? 0);
        precipitationProbability = hourlyProb[targetIndex] ?? 0;
      } else {
        temperature = data.current?.temperature_2m ?? 22.0;
        weatherCode = data.current?.weather_code ?? 0;
        precipitation = data.current?.precipitation ?? 0;

        const currentTime = data.current?.time;
        const currentIndex = currentTime ? hourlyTimes.indexOf(currentTime) : -1;
        precipitationProbability = currentIndex >= 0 ? (hourlyProb[currentIndex] ?? 0) : (hourlyProb[0] ?? 0);
      }

      const weatherInfo = WMO_WEATHER_CODES[weatherCode] || {
        condition: 'Tempo estável',
        willRain: false
      };

      const willRain = weatherInfo.willRain || precipitationProbability >= 50 || precipitation > 0;

      // Seleção de itens horários para a grade do frontend ("Por hora no destino")
      let indicesToTake: number[] = [];
      if (targetDateStr) {
        indicesToTake = hourlyTimes
          .map((t, idx) => ({ t, idx }))
          .filter(({ t }) => t.startsWith(targetDateStr!))
          .map(({ idx }) => idx);
      }

      // Fallback de resiliência: se a data do agendamento estiver além de 7 dias ou sem targetDate,
      // fornece 24 horas a partir do horário atual/inicial
      if (indicesToTake.length === 0) {
        const currentTime = data.current?.time;
        const startIdx = currentTime ? Math.max(0, hourlyTimes.indexOf(currentTime)) : 0;
        const count = Math.min(24, hourlyTimes.length - startIdx);
        indicesToTake = Array.from({ length: count }, (_, i) => startIdx + i);
      }

      const hourly: HourlyWeatherForecastItem[] = indicesToTake
        .filter((idx) => typeof hourlyTimes[idx] === 'string')
        .map((idx) => {
          const timeStr = hourlyTimes[idx] as string;
          const hourPart = timeStr.split('T')[1]?.slice(0, 2) ?? '00';
          const hourFormatted = `${parseInt(hourPart, 10)}h`;
          const code = hourlyCodes[idx] ?? 0;
          const info = WMO_WEATHER_CODES[code] || { condition: 'Tempo estável', willRain: false };
          const temp = hourlyTemp[idx] ?? 20.0;
          const prob = hourlyProb[idx] ?? 0;
          const precip = hourlyPrecip[idx] ?? 0.0;
          const itemWillRain = info.willRain || prob >= 50 || precip > 0;

          return {
            time: timeStr,
            hour: hourFormatted,
            temperature: Math.round(temp * 10) / 10,
            condition: info.condition,
            weatherCode: code,
            precipitationProbability: prob,
            precipitation: Math.round(precip * 10) / 10,
            willRain: itemWillRain
          };
        });

      let recommendation: string;
      if (willRain || precipitationProbability >= 50) {
        recommendation = 'Pode chover na sua saída. Leve guarda-chuva.';
      } else if (precipitationProbability >= 25) {
        recommendation = 'Possibilidade de chuva fraca. Fique atento ao tempo.';
      } else if (temperature < 16) {
        recommendation = 'Clima ameno/frio no local. Considere levar um agasalho.';
      } else if (temperature > 30) {
        recommendation = 'Dia quente no local. Mantenha-se hidratado.';
      } else {
        recommendation = 'Tempo firme e estável para a sua saída.';
      }

      return {
        latitude: Math.round(latitude * 10000) / 10000,
        longitude: Math.round(longitude * 10000) / 10000,
        temperature: Math.round(temperature * 10) / 10,
        condition: weatherInfo.condition,
        weatherCode,
        precipitationProbability,
        precipitation: Math.round(precipitation * 10) / 10,
        willRain,
        recommendation,
        hourly
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

