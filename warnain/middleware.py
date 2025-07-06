import re
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin


class CSRFExemptMiddleware(MiddlewareMixin):
    """
    Middleware to disable CSRF protection for specific URLs in development
    """

    def process_request(self, request):
        if hasattr(settings, "CSRF_EXEMPT_URLS"):
            for url_pattern in settings.CSRF_EXEMPT_URLS:
                if re.match(url_pattern, request.path_info):
                    setattr(request, "_dont_enforce_csrf_checks", True)
        return None
