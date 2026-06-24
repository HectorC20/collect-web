import { Component } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-system',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './system.html',
  styleUrl: './system.scss',
})
export class SystemComponent {
}
