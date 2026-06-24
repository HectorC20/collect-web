import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Material
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatExpansionModule } from '@angular/material/expansion';

// Components
import { PageHeaderOutletComponent } from './components/page-header-outlet/page-header-outlet';
import { PageHeaderComponent } from './components/page-header/page-header';
import { PageLoaderComponent } from './components/page-loader/page-loader';
import { SidebarComponent } from './components/sidebar/sidebar';
import { ModalComponent } from './components/modal/modal.component';
import { ConfirmActionModalComponent } from './components/confirm-action-modal/confirm-action-modal';

@NgModule({
  declarations: [
    PageHeaderOutletComponent,
    PageHeaderComponent,
    PageLoaderComponent,
    SidebarComponent,
  ],

  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatToolbarModule,
    MatExpansionModule,
    ModalComponent,
    ConfirmActionModalComponent,
  ],

  exports: [
    // Angular Material Modules
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatToolbarModule,
    MatExpansionModule,
    // Components
    PageHeaderOutletComponent,
    PageHeaderComponent,
    PageLoaderComponent,
    SidebarComponent,
    ModalComponent,
    ConfirmActionModalComponent,
  ]
})
export class SharedModule {}
