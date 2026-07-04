import { Component, inject } from '@angular/core';
import {ToastService} from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
})
export class ToastComponent {
  protected readonly toasts = inject(ToastService).toasts;
}
