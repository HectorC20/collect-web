import { Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { PortfolioQuickSearchResultInterface } from '../../../interfaces/portfolio.interface';
import { CLIENT_DETAIL_ROUTE } from '../../constants';
import { PortfolioService } from '../../../services/portfolio.service';
import { PageHeaderService } from 'src/app/services/page-header.service';

@Component({
  selector: 'app-page-header-outlet',
  templateUrl: './page-header-outlet.html',
  standalone: false,
  styleUrls: ['./page-header-outlet.scss'],
})
export class PageHeaderOutletComponent {
  readonly pageHeader = inject(PageHeaderService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly portfolioService = inject(PortfolioService);
  private readonly router = inject(Router);

  readonly quickSearchControl = new FormControl('', { nonNullable: true });
  quickSearchResults: PortfolioQuickSearchResultInterface[] = [];
  quickSearchLoading = false;
  quickSearchTouched = false;
  quickSearchOpen = false;
  quickSearchError: string | null = null;

  constructor() {
    this.quickSearchControl.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        tap((value) => {
          this.quickSearchTouched = value.trim().length > 0;
          this.quickSearchError = null;

          if (value.trim().length < 2) {
            this.quickSearchResults = [];
            this.quickSearchLoading = false;
          } else {
            this.quickSearchLoading = true;
          }
        }),
        switchMap((value) => {
          const normalized = value.trim();

          if (normalized.length < 2) {
            return of([]);
          }

          return this.portfolioService.quickSearch(normalized).pipe(
            catchError(() => {
              this.quickSearchError = 'No se pudo buscar clientes.';
              return of([]);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results) => {
        this.quickSearchResults = results;
        this.quickSearchLoading = false;
        this.quickSearchOpen = true;
      });
  }

  onSearchFocus(): void {
    if (this.quickSearchTouched) {
      this.quickSearchOpen = true;
    }
  }

  clearQuickSearch(): void {
    this.quickSearchControl.setValue('', { emitEvent: false });
    this.quickSearchResults = [];
    this.quickSearchTouched = false;
    this.quickSearchLoading = false;
    this.quickSearchError = null;
    this.quickSearchOpen = false;
  }

  openClient(result: PortfolioQuickSearchResultInterface): void {
    this.quickSearchControl.setValue(result.fullName?.trim() || result.dni || '', { emitEvent: false });
    this.quickSearchResults = [];
    this.quickSearchOpen = false;
    void this.router.navigate([CLIENT_DETAIL_ROUTE, result.id]);
  }

  getQuickSearchMeta(result: PortfolioQuickSearchResultInterface): string {
    const contracts = result.contracts
      .map((contract) => [contract.lot, contract.code].filter(Boolean).join(' | '))
      .filter(Boolean)
      .join(' · ');

    return [result.dni, contracts, result.assignedUserName].filter(Boolean).join(' · ');
  }

  @HostListener('document:click')
  closeQuickSearch(): void {
    this.quickSearchOpen = false;
  }
}
