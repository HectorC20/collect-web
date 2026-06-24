import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { extractErrorMessage } from '../../shared/utils/whatsapp.utils';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class Auth {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  error: string | null = null;
  loading = false;

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = null;

    const credentials = {
      email: this.loginForm.value.email!.trim(),
      password: this.loginForm.value.password!
    };

    this.authService.login(credentials).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (response) => {
        if (!response.hasSession()) {
          this.error = response.message || 'Credenciales inválidas.';
          this.cdr.markForCheck();
          return;
        }

        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = extractErrorMessage(err, 'No se pudo iniciar sesión. Intenta nuevamente.');
        this.cdr.markForCheck();
      }
    });
  }
}
