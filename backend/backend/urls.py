# backend\backend\urls.py

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from core.views import serve_react

api_base = "api/v1/"

# ── Core API routes (always active) ───────────────────────────────────────────
urlpatterns = [
    path("admin/", admin.site.urls),
    path(f"{api_base}user/", include("userauths.urls")),
    path(f"{api_base}core/", include("core.urls")),
]

if settings.DEBUG:
    # FIX: In development, do NOT register serve_react.
    # It looks for frontend/dist/index.html which doesn't exist yet —
    # that is the exact cause of "Frontend Build Not Found".
    # React runs on Vite's dev server (localhost:5173), not here.

    def dev_root(request):
        return HttpResponse(
            """
            <html>
            <head><title>FinanceOS API</title></head>
            <body style="font-family:monospace;padding:2rem;
                         background:#0f172a;color:#e2e8f0;">
                <h2 style="color:#60a5fa;">FinanceOS &mdash; Django API Server</h2>
                <p style="color:#94a3b8;">
                    Running in <strong style="color:#34d399;">DEBUG</strong> mode
                    on <strong>localhost:8000</strong>
                </p>
                <hr style="border:none;border-top:1px solid #1e293b;margin:1.5rem 0;">
                <p>The React frontend runs on Vite&apos;s dev server.</p>
                <p>
                    &#x27A4; Open your app at&nbsp;
                    <a href="http://localhost:5173"
                       style="color:#34d399;font-weight:bold;">
                        http://localhost:5173
                    </a>
                </p>
                <hr style="border:none;border-top:1px solid #1e293b;margin:1.5rem 0;">
                <p style="color:#64748b;font-size:0.85rem;">
                    API base: <code style="color:#f59e0b;">api/v1/</code><br><br>
                    &nbsp;POST <code>/api/v1/user/auth/send-otp/</code><br>
                    &nbsp;POST <code>/api/v1/user/auth/login/</code><br>
                    &nbsp;POST <code>/api/v1/user/auth/register/</code><br>
                    &nbsp;POST <code>/api/v1/user/auth/token/refresh/</code><br>
                    &nbsp;POST <code>/api/v1/user/auth/logout/</code><br>
                    &nbsp;GET &nbsp;<code>/api/v1/user/profile/</code><br>
                    &nbsp;GET &nbsp;<code>/api/v1/core/overview/</code><br>
                </p>
            </body>
            </html>
            """,
            content_type="text/html",
        )

    urlpatterns += [path("", dev_root)]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

else:
    # Production only: serve compiled React SPA for all non-API routes.
    # Negative lookahead prevents API/admin/static/media being swallowed.
    urlpatterns += [
        re_path(
            r"^(?!admin/|api/|static/|media/).*$",
            serve_react,
            name="frontend",
        ),
    ]