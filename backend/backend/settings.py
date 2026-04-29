# backend/settings.py

from pathlib import Path
from datetime import timedelta
import os
import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

SECRET_KEY = env("SECRET_KEY", default="django-insecure-placeholder-key")
DEBUG = env.bool("DEBUG", default=True)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])

INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'userauths',
    'core',
]

# ── Middleware ────────────────────────────────────────────────────────────────
# FIX 1: CorsMiddleware MUST be first — before SecurityMiddleware.
# FIX 2: WhitenoiseMiddleware MUST come immediately after SecurityMiddleware
#         and before everything else — it intercepts static file requests
#         early so Django never processes them as views.
# FIX 3: SessionMiddleware and AuthenticationMiddleware were in wrong positions.
#         Django requires this exact order for auth + messages to work.
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',               # 1st — must be first
    'django.middleware.security.SecurityMiddleware',        # 2nd
    'whitenoise.middleware.WhiteNoiseMiddleware',           # 3rd — right after Security
    'django.contrib.sessions.middleware.SessionMiddleware', # 4th
    'django.middleware.common.CommonMiddleware',            # 5th
    'django.middleware.csrf.CsrfViewMiddleware',            # 6th — FIX: was missing entirely
    'django.contrib.auth.middleware.AuthenticationMiddleware', # 7th
    'django.contrib.messages.middleware.MessageMiddleware', # 8th
    'django.middleware.clickjacking.XFrameOptionsMiddleware', # 9th
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    # FIX 4: Add BASE_DIR / 'templates' so Django can find any top-level templates.
    # Required if you add a custom 404/500 page or admin overrides.
    'DIRS': [BASE_DIR / 'templates'],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.debug',  # FIX: missing debug context
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]

WSGI_APPLICATION = 'backend.wsgi.application'

# ── Database ──────────────────────────────────────────────────────────────────
try:
    import dj_database_url
    DATABASES = {'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR}/db.sqlite3', conn_max_age=600
    )}
except ImportError:
    DATABASES = {'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }}

# ── Password validation ────────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ── Static & media files ──────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# FIX 5: CompressedManifestStaticFilesStorage breaks in DEBUG mode because
# it requires `collectstatic` to have been run first (generates a manifest).
# In development, use the simple default storage instead.
if DEBUG:
    STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'
else:
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── CORS ───────────────────────────────────────────────────────────────────────
_frontend_origins = env.list("FRONTEND_ORIGINS", default=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
])
CORS_ALLOWED_ORIGINS = _frontend_origins
CORS_ALLOW_CREDENTIALS = True          # Required for HttpOnly cookie auth
CSRF_TRUSTED_ORIGINS = _frontend_origins

# ── Cookie / session ──────────────────────────────────────────────────────────
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = not DEBUG      # False in dev (no HTTPS), True in prod
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = not DEBUG
# FIX 6: Make refresh token cookie httponly and scoped to the refresh endpoint.
# Without this, the JWT refresh cookie is accessible to JavaScript,
# which defeats the purpose of using HttpOnly cookies for security.
SIMPLE_JWT_REFRESH_COOKIE = 'refresh_token'
SIMPLE_JWT_REFRESH_COOKIE_HTTPONLY = True
SIMPLE_JWT_REFRESH_COOKIE_PATH = '/user/auth/token/refresh/'

# ── DRF ───────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}

# ── Simple JWT ────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    # FIX 7: ROTATE_REFRESH_TOKENS=True causes the old refresh token to be
    # invalidated after each use. Combined with BLACKLIST_AFTER_ROTATION=True
    # this is more secure. Left as False to match original intent — change
    # both to True together if you want rotation.
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
    "AUTH_COOKIE": "access_token",
    "AUTH_COOKIE_REFRESH": "refresh_token",
    "AUTH_COOKIE_SECURE": not DEBUG,   # True in production (HTTPS only)
    "AUTH_COOKIE_HTTP_ONLY": True,     # JS cannot read the cookie
    "AUTH_COOKIE_PATH": "/",
    "AUTH_COOKIE_SAMESITE": "Lax",
}

AUTH_USER_MODEL = "userauths.User"

# ── Third-party keys ──────────────────────────────────────────────────────────
STRIPE_PUBLIC_KEY = env("STRIPE_PUBLIC_KEY", default="")
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")

# Fast2SMS — leave blank in dev, OTP prints to console
FAST2SMS_API_KEY = env("FAST2SMS_API_KEY", default="")

# ── Email / SMTP ───────────────────────────────────────────────────────────────
# In development, emails print to console (default).
# In production set EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# and provide SMTP credentials in .env
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env(
    "DEFAULT_FROM_EMAIL",
    default="FinanceOS <noreply@financeos.in>"
)

# ── OTP ────────────────────────────────────────────────────────────────────────
OTP_EXPIRY_MINUTES = env.int("OTP_EXPIRY_MINUTES", default=10)
OTP_LENGTH = env.int("OTP_LENGTH", default=6)

# ── Cache (required by otp_service.py) ────────────────────────────────────────
# FIX 8: otp_service.py uses django.core.cache to store OTPs.
# Without an explicit CACHES config, Django uses LocMemCache which is
# per-process and doesn't persist across runserver restarts.
# This is fine for development. For production, switch to Redis.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "financeos-otp-cache",
    }
    # ── Production: uncomment and set REDIS_URL in .env ──────────────────
    # "default": {
    #     "BACKEND": "django.core.cache.backends.redis.RedisCache",
    #     "LOCATION": env("REDIS_URL", default="redis://localhost:6379/1"),
    # }
}

# ── Logging (development) ──────────────────────────────────────────────────────
# FIX 9: Add basic logging so OTP codes, errors, and request info are visible
# in the terminal during development without needing print() statements.
if DEBUG:
    LOGGING = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "simple": {
                "format": "[{levelname}] {name}: {message}",
                "style": "{",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "simple",
            },
        },
        "root": {
            "handlers": ["console"],
            "level": "DEBUG",
        },
        "loggers": {
            "django": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "django.request": {
                "handlers": ["console"],
                "level": "DEBUG",
                "propagate": False,
            },
        },
    }