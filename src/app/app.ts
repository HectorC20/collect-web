import { Component, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SharedModule } from './shared/shared.module';
import { PageHeaderService } from './services/page-header.service';
import { SnackbarComponent } from './shared/components/snackbar/snackbar.component';

@Component({
  selector: 'app-root',
  imports: [SharedModule, SnackbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private router = inject(Router);
  readonly pageHeader = inject(PageHeaderService);
  showSidebar = signal(false);
 
  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const shouldShowSidebar = !event.urlAfterRedirects.includes('/auth');
      this.showSidebar.set(shouldShowSidebar);

      if (!shouldShowSidebar) {
        this.pageHeader.clear();
      }
    });
  }
}

