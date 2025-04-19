import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { StorageService } from '../services/storage.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RoleType } from '../models/role.model';
import { User } from '../models/user.model';

declare var google: any;

@Component({
  selector: 'app-authentication',
  templateUrl: './authentication.component.html',
  styleUrls: ['./authentication.component.css']
})
export class AuthenticationComponent implements OnInit {
  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(2)])
  });

  isLoggedIn = false;
  isLoginFailed = false;
  isLoading = false;
  errorMessage = '';
  hidePassword = true;

  constructor(
    private userService: UserService,
    private storageService: StorageService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const storedUser = this.storageService.getUser();
    if (storedUser) {
      this.isLoggedIn = true;
      this.redirectBasedOnRole(storedUser.role);
    }

    this.initializeGoogleSignIn();
  }

  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  private initializeGoogleSignIn(): void {
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: '376533833455-qgcjilh1un1k0cfunakdab8b328a0p9f.apps.googleusercontent.com',
        callback: (response: any) => this.handleGoogleSignIn(response)
      });

      google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        { theme: 'outline', size: 'large' }
      );
    }
  }

  handleGoogleSignIn(response: any): void {
    this.isLoading = true;

    this.userService.loginWithGoogle(response.credential).subscribe({
      next: (res) => this.handleLoginSuccess(res),
      error: (error) => this.handleLoginError(error)
    });
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    this.userService.login({
      email: this.email?.value || '',
      password: this.password?.value || ''
    }).subscribe({
      next: (res) => this.handleLoginSuccess(res),
      error: (error) => this.handleLoginError(error)
    });
  }

  private handleLoginSuccess(response: any): void {
    const user: User = {
      email: response.email,
      nom: response.nom,
      prenom: response.prenom,
      sexe: response.gender,
      dateNaissance: new Date(response.birthDate),
      role: response.role
    };

    this.storageService.saveAuthData({
      token: response.token,
      user: user
    });

    this.isLoggedIn = true;
    this.isLoginFailed = false;
    this.isLoading = false;

    this.showSnackbar('Login successful!', 'success-snackbar');
    this.redirectBasedOnRole(user.role);
  }

  private handleLoginError(error: any): void {
    this.isLoginFailed = true;
    this.isLoading = false;
    this.errorMessage = error?.error?.message || error?.message || 'Authentication failed. Please try again.';
    this.showSnackbar(this.errorMessage, 'error-snackbar');
  }

  private showSnackbar(message: string, panelClass: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: [panelClass]
    });
  }

  redirectBasedOnRole(role: any): void {
    const roleString = typeof role === 'object' && 'roleType' in role ? role.roleType : role;
    console.log('Redirecting based on role:', roleString);

    if (roleString === RoleType.ADMIN || roleString === 'ADMIN') {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/front']);
    }
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }
}
