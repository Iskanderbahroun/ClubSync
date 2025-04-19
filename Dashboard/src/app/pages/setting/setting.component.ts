// settings.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { UserRequest } from '../../models/user-request.model';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  selector: 'app-setting',
  templateUrl: './setting.component.html',
  styleUrls: ['./setting.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  user: User | null = null;
  settingsForm: FormGroup;
  passwordForm: FormGroup;
  isEditing = false;
  isLoading = false;
  message = { text: '', type: '' };
  showPassword = false;
  userId: number | null = null;
  
  // Add missing properties referenced in template
  isLoggedIn = false;
  showDropdown = false;
  userEmail = '';

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.settingsForm = this.fb.group({
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      dateNaissance: [''],
      sexe: [''],
      numeroDeTelephone: [''],
      photoProfil: [''],
      id_role: [''] // Added this field to match UserRequest model
    });

    this.passwordForm = this.fb.group({
      password: ['', [Validators.minLength(8)]],
      confirmPassword: ['']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Hide preloader
    setTimeout(() => {
      const preloader = document.getElementById('preloader-active');
      if (preloader) {
        preloader.style.display = 'none';
      }
    }, 1000);
    this.loadUserData();
    this.userId = this.userService.getUserId();
    
    // Subscribe to the isLoggedIn$ observable
    this.userService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
      
      // Set user email if logged in
      if (isLoggedIn && this.user) {
        this.userEmail = this.user.email || '';
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up event listeners
    window.removeEventListener('click', this.closeDropdown);
  }

  loadUserData(): void {
    this.user = this.userService.user;
    if (this.user) {
      this.populateForm(this.user);
      this.userEmail = this.user.email || '';
    } else {
      this.userService.getUserInfo().subscribe({
        next: (userData) => {
          this.user = this.userService.user;
          if (this.user) {
            this.populateForm(this.user);
            this.userEmail = this.user.email || '';
          }
        },
        error: (err) => {
          this.message = { text: 'Failed to load user data. Please try again.', type: 'error' };
        }
      });
    }
  }

  populateForm(user: User): void {
    this.settingsForm.patchValue({
      prenom: user.prenom || '',
      nom: user.nom || '',
      email: user.email || '',
      dateNaissance: user.dateNaissance ? this.formatDate(user.dateNaissance) : '',
      sexe: user.sexe || '',
      numeroDeTelephone: user.numeroDeTelephone || '',
      photoProfil: user.photoProfil || '',
      id_role: user.role?.id || '' // Get role ID from the user's role object
    });
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  handleEdit(): void {
    this.isEditing = true;
  }

  handleCancel(): void {
    this.isEditing = false;
    this.passwordForm.reset();
    if (this.user) {
      this.populateForm(this.user);
    }
    this.message = { text: '', type: '' };
  }

  handleSave(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      this.message = { text: 'Please correct the form errors before submitting.', type: 'error' };
      return;
    }

    if (this.passwordForm.value.password && this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.message = { text: 'Password confirmation does not match or is too short.', type: 'error' };
      return;
    }

    this.isLoading = true;

    // Create a properly structured UserRequest object
    const userRequest: UserRequest = {
      prenom: this.settingsForm.value.prenom,
      nom: this.settingsForm.value.nom,
      email: this.settingsForm.value.email,
      dateNaissance: this.settingsForm.value.dateNaissance ? new Date(this.settingsForm.value.dateNaissance) : null,
      sexe: this.settingsForm.value.sexe,
      numeroDeTelephone: this.settingsForm.value.numeroDeTelephone,
      photoProfil: this.settingsForm.value.photoProfil,
      password: this.passwordForm.value.password || '', // Include password even if empty
      id_role: this.settingsForm.value.id_role // Include the role ID
    };

    if (this.userId) {
      this.userService.updateUser(this.userId, userRequest)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (response) => {
            this.isEditing = false;
            this.message = { text: 'Profile updated successfully!', type: 'success' };
            
            // Update the local user data
            if (this.user) {
              this.user = {
                ...this.user,
                prenom: userRequest.prenom,
                nom: userRequest.nom,
                email: userRequest.email,
                dateNaissance: userRequest.dateNaissance,
                sexe: userRequest.sexe,
                numeroDeTelephone: userRequest.numeroDeTelephone,
                photoProfil: userRequest.photoProfil
                // Don't update role here as it might need special handling
              };
              this.populateForm(this.user);
              this.userEmail = this.user.email || '';
            }
            
            // Clear message after 3 seconds
            setTimeout(() => {
              this.message = { text: '', type: '' };
            }, 3000);
          },
          error: (err) => {
            this.message = { text: err.message || 'Failed to update profile. Please try again.', type: 'error' };
          }
        });
    } else {
      this.isLoading = false;
      this.message = { text: 'User ID not found. Please log in again.', type: 'error' };
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.settingsForm.patchValue({
          photoProfil: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Add methods for header/navigation functionality
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
    
    // Close dropdown when clicking outside
    if (this.showDropdown) {
      setTimeout(() => {
        window.addEventListener('click', this.closeDropdown);
      });
    }
  }

  closeDropdown = (): void => {
    this.showDropdown = false;
    window.removeEventListener('click', this.closeDropdown);
  }

  navigateToSettings(): void {
    // Since we're already on the settings page, just close the dropdown
    this.closeDropdown();
  }

  logout(): void {
    this.userService.logout().subscribe({
      next: () => {
        // Navigate to home or login page after logout
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Even if there's an error, redirect to home
        this.router.navigate(['/']);
      }
    });
  }
}