import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { JwtService } from './../../service/jwt.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Application } from '@splinetool/runtime';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    MatIconModule
  ]
})
export class LoginComponent implements OnInit, AfterViewInit {

  @ViewChild('canvas3d', { static: true }) canvas3d!: ElementRef<HTMLCanvasElement>;
  loginForm!: FormGroup;
  isLoading: boolean = false;
  isModalLoading: boolean = false;
  showForgotPasswordModal: boolean = false;
  forgotPasswordEmail: string = '';
  otp: string = '';
  newPassword: string = '';
  otpSent: boolean = false;
  otpVerified: boolean = false;
  timer: number = 120;
  showPassword: boolean = false;

  constructor(
    private fb: FormBuilder, 
    private service: JwtService, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  
    // Check for query params (from OAuth2 redirect)
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        // If token is passed as a query parameter from OAuth
        console.log('OAuth token found in URL');
        localStorage.setItem('jwt', params['token']);
        this.router.navigate(['/dashboard']);
      } else if (params['login'] === 'success') {
        // If success flag is passed
        console.log('OAuth login success flag found');
        this.checkAuthAndRedirect();
      } else if (params['error'] === 'oauth2') {
        // Handle OAuth error
        console.error('OAuth authentication error');
        alert('OAuth authentication failed. Please try again or use email/password login.');
      }
    });
  }
  private checkAuthAndRedirect(): void {
    this.service.checkAuth().subscribe(isAuthenticated => {
      if (isAuthenticated) {
        console.log('User is authenticated, redirecting to dashboard');
        this.router.navigate(['/dashboard']);
      } else {
        console.log('Authentication check failed, will attempt to get user info');
        
        // Try to get user info which might include token
        this.service.getUserInfo().subscribe({
          next: (response) => {
            if (response.authenticated) {
              console.log('User info confirms authentication, redirecting to dashboard');
              this.router.navigate(['/dashboard']);
            } else {
              console.log('Failed to confirm authentication via user info');
            }
          },
          error: (error) => {
            console.error('Error getting user info:', error);
          }
        });
      }
    });
  }
  ngAfterViewInit(): void {
    const app = new Application(this.canvas3d.nativeElement);
    app.load('https://prod.spline.design/mEfZs9zaxqVlMcyO/scene.splinecode');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  loginWithGoogle(): void {
    console.log('Initiating Google login...');
    this.isLoading = true;
    
    
    setTimeout(() => {
      this.isLoading = false;
    }, 5000);
    
    this.service.initiateGoogleLogin();
  }
  
  showForgotPassword(event: Event): void {
    event.preventDefault();
    this.showForgotPasswordModal = true;
    this.forgotPasswordEmail = '';
    this.otp = '';
    this.newPassword = '';
    this.otpSent = false;
    this.otpVerified = false;
    this.timer = 120;
  }

  sendOtp(): void {
    this.isModalLoading = true;
    this.service.sendForgotPasswordOtp(this.forgotPasswordEmail).subscribe(
      (response: any) => {
        console.log('OTP sent successfully:', response);
        this.otpSent = true;
        this.isModalLoading = false;
        this.startTimer();
      },
      (error: any) => {
        console.error('Error sending OTP:', error);
        alert('Error sending OTP: ' + (error.error?.message || 'Unknown error'));
        this.isModalLoading = false;
      }
    );
  }

  startTimer(): void {
    this.timer = 120;
    const intervalId = setInterval(() => {
      this.timer--;
      if (this.timer === 0) {
        clearInterval(intervalId);
      }
    }, 1000);
  }

  verifyOtp(): void {
    this.isModalLoading = true;
    const resetPasswordRequest = {
      email: this.forgotPasswordEmail,
      otp: this.otp,
      newPassword: this.newPassword
    };

    this.service.verifyForgotPasswordOtp(resetPasswordRequest).subscribe(
      (response: any) => {
        console.log('Password reset successful:', response);
        this.otpVerified = true;
        this.isModalLoading = false;
      },
      (error: any) => {
        console.error('OTP verification failed:', error);
        alert('OTP verification failed: ' + (error.error?.message || 'Unknown error'));
        this.isModalLoading = false;
      }
    );
  }

  resendOtp(): void {
    this.isModalLoading = true;
    this.service.resendForgotPasswordOtp(this.forgotPasswordEmail).subscribe(
      (response: any) => {
        console.log('OTP resent successfully:', response);
        this.timer = 120;
        this.startTimer();
        this.isModalLoading = false;
      },
      (error: any) => {
        console.error('Error resending OTP:', error);
        alert('Error resending OTP: ' + (error.error?.message || 'Unknown error'));
        this.isModalLoading = false;
      }
    );
  }

  closeForgotPasswordModal(): void {
    this.showForgotPasswordModal = false;
  }

  redirectToLogin(): void {
    this.showForgotPasswordModal = false;
    alert('Password reset successful! You can now log in with your new password.');
  }

  submitForm(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const loginData = this.loginForm.value;
      
      console.log('Submitting login form:', {
        email: loginData.email,
        password: '********'
      });
  
      this.service.login(loginData).subscribe(
        (response: any) => {
          console.log('Login successful:', response);
          if (response && response.jwtToken) {
            localStorage.setItem('jwt', response.jwtToken);
            console.log('JWT token saved to localStorage');
          }
          this.router.navigateByUrl('/dashboard').then(() => {
            console.log('Redirected to dashboard');
            this.isLoading = false;
          });
        },
        (error: any) => {
          console.error('Login failed:', error);
          alert('Login failed: ' + (error.error?.message || 'Unknown error'));
          this.isLoading = false;
        }
      );
    } else {
      console.log('Form is invalid:', this.loginForm.errors);
      alert('Please fill out all required fields correctly.');
    }
  }
}