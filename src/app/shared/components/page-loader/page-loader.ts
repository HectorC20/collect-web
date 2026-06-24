import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-loader',
  templateUrl: './page-loader.html',
  standalone: false,
  styleUrls: ['./page-loader.scss'],
})
export class PageLoaderComponent {
  @Input() show = false;
  @Input() message = 'Cargando...';
}
