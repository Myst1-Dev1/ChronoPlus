import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  inject
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { LucideAngularModule, X } from 'lucide-angular';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent implements OnChanges, OnDestroy {
  private readonly document = inject(DOCUMENT);

  @Input() isOpen = false;
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() showCloseButton = true;
  @Input() showDragHandle = true;
  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;
  @Input() maxWidth = '460px';

  @Output() closed = new EventEmitter<void>();

  readonly CloseIcon = X;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      this.toggleBodyScroll(this.isOpen);
    }
  }

  ngOnDestroy(): void {
    this.toggleBodyScroll(false);
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.isOpen && this.closeOnEscape) {
      event.preventDefault();
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop && event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  private toggleBodyScroll(disable: boolean): void {
    if (typeof this.document !== 'undefined' && this.document.body) {
      if (disable) {
        this.document.body.style.overflow = 'hidden';
      } else {
        this.document.body.style.overflow = '';
      }
    }
  }
}
