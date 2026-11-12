import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="spinner-wrapper" [class]="'size-' + size()">
      <svg
        class="spinner"
        [class]="'color-' + color()"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          class="track"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="3"
        ></circle>
        <path
          class="indicator"
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
        ></path>
      </svg>
      @if (label()) {
        <span class="spinner-label">{{ label() }}</span>
      }
    </div>
  `,
  styles: [`
    .spinner-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .spinner {
      animation: spin 0.8s linear infinite;
    }

    .track {
      opacity: 0.25;
    }

    .indicator {
      opacity: 1;
    }

    .size-sm .spinner {
      width: 1rem;
      height: 1rem;
    }

    .size-md .spinner {
      width: 1.25rem;
      height: 1.25rem;
    }

    .size-lg .spinner {
      width: 2rem;
      height: 2rem;
    }

    .color-light {
      color: #ffffff;
    }

    .color-primary {
      color: #5352ed;
    }

    .color-current {
      color: currentColor;
    }

    .spinner-label {
      font-size: 0.875rem;
      font-weight: 500;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class LoadingSpinnerComponent {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly color = input<'light' | 'primary' | 'current'>('current');
  readonly label = input<string>('');
}
