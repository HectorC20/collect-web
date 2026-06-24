import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { SnackbarService } from '../../../services/snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './snackbar.component.html',
  styleUrl: './snackbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnackbarComponent {
  protected readonly snackbarService = inject(SnackbarService);

  dismiss(): void {
    this.snackbarService.dismiss();
  }
}
