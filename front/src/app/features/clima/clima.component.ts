import { Component, signal, computed, inject, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import {
  LucideAngularModule,
  Search,
  ChevronDown,
  MapPin,
  Locate,
  Clock,
  CloudRain,
  CloudSun,
  Sun,
  Cloud,
  Umbrella,
  Bell
} from 'lucide-angular';
import { WeatherService, type WeatherForecast } from '../../core/services/weather.service';
import { AuthService } from '../../core/services/auth.service';
import { type Reminder } from '../../core/services/reminders.service';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavbarComponent } from '../../shared/components/bottom-navbar/bottom-navbar.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { CreateReminderModalComponent } from '../agenda/components/create-reminder-modal/create-reminder-modal.component';

export interface DisplayHourCard {
  timeRaw: string;
  hourLabel: string;
  temperature: number;
  precipitationProbability: number;
  condition: string;
  weatherCode: number;
  isSelected: boolean;
}

@Component({
  selector: 'app-clima',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    BottomNavbarComponent,
    LoadingSpinnerComponent,
    LucideAngularModule,
    CreateReminderModalComponent
  ],
  templateUrl: './clima.component.html',
  styleUrl: './clima.component.css'
})
export class ClimaComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly weatherService = inject(WeatherService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Instância do Mapa Leaflet
  private map?: L.Map;
  private marker?: L.Marker;

  // Ícones Lucide
  readonly SearchIcon = Search;
  readonly ChevronDownIcon = ChevronDown;
  readonly MapPinIcon = MapPin;
  readonly LocateIcon = Locate;
  readonly ClockIcon = Clock;
  readonly CloudRainIcon = CloudRain;
  readonly CloudSunIcon = CloudSun;
  readonly SunIcon = Sun;
  readonly CloudIcon = Cloud;
  readonly UmbrellaIcon = Umbrella;
  readonly BellIcon = Bell;

  // Estados reativos
  readonly destination = signal<string>('São Gonçalo, Rio de Janeiro, Brasil');
  readonly weather = signal<WeatherForecast | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedHour = signal<string>('18:00');
  readonly isCreateModalOpen = signal<boolean>(false);

  // Campo de busca editável
  searchQuery = 'São Gonçalo, Rio de Janeiro, Brasil';

  // Data alvo padrão para o agendamento de saída (hoje)
  readonly targetReminderDate = new Date();

  // Coordenadas ativas (do clima consultado ou fallback especificado)
  readonly activeLatitude = computed(() => this.weather()?.latitude ?? -23.5998);
  readonly activeLongitude = computed(() => this.weather()?.longitude ?? -46.7145);

  // Data formatada por extenso (ex: "6 de outubro de 2026")
  readonly formattedDateSubtitle = computed(() => {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return `Previsão ilustrativa · ${formatter.format(today)}`;
  });

  // Nome simplificado do destino para exibição no mapa
  readonly destinationShortLabel = computed(() => {
    const dest = this.destination();
    return dest.split(',')[0]?.trim() || dest;
  });

  // Dados do horário selecionado para o card de destaque principal
  readonly activeWeatherStats = computed(() => {
    const w = this.weather();
    if (!w) {
      return {
        temperature: 24,
        condition: 'Pancadas de chuva',
        precipitationProbability: 70,
        recommendation: 'Pode chover na sua saída. Leve guarda-chuva.'
      };
    }

    const selHourNum = parseInt(this.selectedHour().split(':')[0] || '18', 10);
    const hourlyMatch = w.hourly?.find((h) => {
      const match = h.hour.replace('h', '');
      return parseInt(match, 10) === selHourNum;
    });

    if (hourlyMatch) {
      return {
        temperature: Math.round(hourlyMatch.temperature),
        condition: hourlyMatch.condition || w.condition,
        precipitationProbability: hourlyMatch.precipitationProbability,
        recommendation: hourlyMatch.willRain || hourlyMatch.precipitationProbability > 40
          ? 'Pode chover na sua saída. Leve guarda-chuva.'
          : w.recommendation
      };
    }

    return {
      temperature: Math.round(w.temperature),
      condition: w.condition,
      precipitationProbability: w.precipitationProbability,
      recommendation: w.recommendation
    };
  });

  // Faixa de 4 cartões com a previsão por hora (ex: 17h, 18h, 19h, 20h)
  readonly displayHourlyCards = computed<DisplayHourCard[]>(() => {
    const w = this.weather();
    const selHourNum = parseInt(this.selectedHour().split(':')[0] || '18', 10);

    if (!w?.hourly || w.hourly.length === 0) {
      return [
        { timeRaw: '17:00', hourLabel: '17h', temperature: 25, precipitationProbability: 40, condition: 'Parcialmente nublado', weatherCode: 2, isSelected: selHourNum === 17 },
        { timeRaw: '18:00', hourLabel: '18h', temperature: 24, precipitationProbability: 70, condition: 'Pancadas de chuva', weatherCode: 51, isSelected: selHourNum === 18 },
        { timeRaw: '19:00', hourLabel: '19h', temperature: 23, precipitationProbability: 80, condition: 'Chuva', weatherCode: 61, isSelected: selHourNum === 19 },
        { timeRaw: '20:00', hourLabel: '20h', temperature: 22, precipitationProbability: 60, condition: 'Chuva', weatherCode: 61, isSelected: selHourNum === 20 }
      ];
    }

    const targetStart = Math.max(0, Math.min(selHourNum - 1, w.hourly.length - 4));
    const slice = w.hourly.slice(targetStart, targetStart + 4);

    return slice.map((h) => {
      const hourClean = h.hour.replace('h', '');
      const num = parseInt(hourClean, 10);
      return {
        timeRaw: `${String(num).padStart(2, '0')}:00`,
        hourLabel: `${num}h`,
        temperature: Math.round(h.temperature),
        precipitationProbability: h.precipitationProbability,
        condition: h.condition,
        weatherCode: h.weatherCode,
        isSelected: num === selHourNum
      };
    });
  });

  ngOnInit(): void {
    // 1. O valor padrão do campo de pesquisa deve ser baseado nos campos address, city e state do usuário logado
    const user = this.authService.currentUser();
    const addressParts = [
      user?.address && user.address !== 'Não informado' ? user.address : null,
      user?.city,
      user?.state
    ].filter(Boolean);

    const defaultLocation = addressParts.length > 0
      ? addressParts.join(', ')
      : 'São Gonçalo, Rio de Janeiro, Brasil';

    this.destination.set(defaultLocation);
    this.searchQuery = defaultLocation;

    this.fetchWeather(defaultLocation);
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.marker = undefined;
    }
  }

  fetchWeather(dest?: string): void {
    const rawDest = dest || this.destination();
    const targetDest = rawDest.replace(/\r?\n+/g, ', ').trim();
    if (!targetDest) return;

    this.destination.set(targetDest);
    this.searchQuery = targetDest;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.weatherService.getWeatherByDestination(targetDest).subscribe({
      next: (data) => {
        this.weather.set(data);
        this.isLoading.set(false);

        if (data?.latitude != null && data?.longitude != null) {
          this.updateMapLocation(data.latitude, data.longitude);
        }
      },
      error: (err) => {
        console.warn('[Clima] Erro ao carregar previsão meteorológica via GraphQL:', err);
        this.errorMessage.set('Não foi possível carregar a previsão meteorológica.');
        this.isLoading.set(false);
      }
    });
  }

  // Inicializa o mapa Leaflet centrado nas coordenadas atuais
  private initMap(): void {
    if (typeof window === 'undefined' || this.map) return;

    const mapElement = document.getElementById('weather-leaflet-map');
    if (!mapElement) return;

    const lat = this.activeLatitude();
    const lng = this.activeLongitude();

    this.map = L.map('weather-leaflet-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([lat, lng], 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.map);

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    this.marker = L.marker([lat, lng], {
      icon: this.createMarkerIcon()
    }).addTo(this.map);

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 250);
  }

  // Cria marcador customizado com o padrão de design roxo do ChronoPlus
  private createMarkerIcon(): L.DivIcon {
    return L.divIcon({
      className: 'leaflet-custom-marker-wrapper',
      html: `
        <div class="leaflet-pin-content">
          <div class="leaflet-pin-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <span class="leaflet-pin-label">${this.destinationShortLabel()}</span>
        </div>
      `,
      iconSize: [40, 50],
      iconAnchor: [20, 44]
    });
  }

  // Atualiza suavemente a posição do mapa e do pin com as novas coordenadas
  private updateMapLocation(lat: number, lng: number): void {
    if (!this.map) {
      this.initMap();
      return;
    }

    this.map.flyTo([lat, lng], 14, { duration: 1.2 });

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
      this.marker.setIcon(this.createMarkerIcon());
    } else {
      this.marker = L.marker([lat, lng], {
        icon: this.createMarkerIcon()
      }).addTo(this.map);
    }
  }

  // Centraliza o mapa nas coordenadas ativas pesquisadas
  recenterMap(): void {
    const lat = this.activeLatitude();
    const lng = this.activeLongitude();
    if (this.map && lat != null && lng != null) {
      this.map.flyTo([lat, lng], 15, { duration: 1 });
    }
  }

  onSearchSubmit(): void {
    const q = this.searchQuery?.replace(/\r?\n+/g, ', ').trim();
    if (!q) return;
    this.fetchWeather(q);
  }

  selectHour(hourStr: string): void {
    this.selectedHour.set(hourStr);
  }

  openCreateReminderModal(): void {
    this.isCreateModalOpen.set(true);
  }

  closeCreateReminderModal(): void {
    this.isCreateModalOpen.set(false);
  }

  onReminderCreated(newReminder?: Reminder): void {
    this.closeCreateReminderModal();
    if (newReminder?.reminderDate) {
      const d = new Date(newReminder.reminderDate);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const localDateStr = `${y}-${m}-${day}`;
      this.router.navigate(['/agenda'], { queryParams: { date: localDateStr } });
    } else {
      this.router.navigate(['/agenda']);
    }
  }

  getWeatherIconComponent(code: number | undefined) {
    if (code === undefined) return this.CloudRainIcon;
    if (code === 0) return this.SunIcon;
    if (code <= 2) return this.CloudSunIcon;
    if (code <= 48) return this.CloudIcon;
    return this.CloudRainIcon;
  }
}
