import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserService } from '../services/user.service';
import { UserResponse } from '../models/user-response.model';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from 'app/confirm-dialog/confirm-dialog.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  users: UserResponse[] = [];
  loading = true;

  constructor(
    private userService: UserService,
    private router: Router,
    private changeDetector: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    document.querySelector('.fixed-plugin')?.remove();
  }

  private loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
        this.changeDetector.detectChanges();
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.loading = false;
        this.changeDetector.detectChanges();
      }
    });
  }

  onEdit(userId: number): void {
    this.router.navigate(['/users/edit', userId]);
  }

  onToggleBan(user: UserResponse): void {
    const isBanned = user.archived;
    
    // Optimistically update the UI first
    user.archived = !isBanned;
    
    // Call the appropriate service method
    const action$ = isBanned 
      ? this.userService.restoreUser(user.idUser) 
      : this.userService.archiveUser(user.idUser);
  
    // Use type assertion if necessary to help TypeScript
    (action$ as Observable<any>).subscribe({
      next: () => {
        console.log(`${isBanned ? 'Unbanned' : 'Banned'} user successfully.`);
        // Refresh the list to ensure sync with server
        this.loadUsers();
      },
      error: (error) => {
        console.error(`Error during ${isBanned ? 'unban' : 'ban'}:`, error);
        // Revert the change if there was an error
        user.archived = isBanned;
        this.changeDetector.detectChanges();
      }
    });
  }
  trackById(index: number, user: UserResponse): number {
    return user.idUser;
  }
}