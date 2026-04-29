# users/urls.py
from django.urls import path
from userauths import views

urlpatterns = [
    # Auth — public
    path('auth/send-otp/', views.SendOTPView.as_view(), name='send_otp'),        # matches AuthContext
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/token/refresh/', views.CookieTokenRefreshView.as_view(), name='token_refresh'),

    # Profile — authenticated
    path('profile/', views.UserView.as_view(), name='user'),
    path('profile/update/', views.UserUpdateView.as_view(), name='user_update'),

    # KYC — authenticated
    path('kyc-profile/', views.KYCView.as_view(), name='kyc_profile'),
    path('kyc/', views.KYCCreateView.as_view(), name='kyc_create'),

    # Transaction PIN — authenticated
    path('auth/pin/set/', views.SetTransactionPinView.as_view(), name='set_pin'),

    # Bank Account — authenticated
    path('bank/send-otp/', views.SendBankOTPView.as_view(), name='bank_send_otp'),
    path('bank/link/', views.LinkBankAccountView.as_view(), name='bank_link'),
    path('bank/accounts/', views.BankAccountListView.as_view(), name='bank_accounts_list'),
    path('bank/accounts/<uuid:pk>/', views.BankAccountDetailView.as_view(), name='bank_account_detail'),
]
